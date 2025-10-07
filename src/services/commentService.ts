import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export type CommentTargetType = 'exercise' | 'route' | 'event' | 'custom_exercise';

export interface CommentRecord {
  id: string;
  target_type: CommentTargetType;
  target_id: string;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  rich: any;
  is_edited: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  comment_attachments?: Array<{ id: string; type: string; url: string; metadata: any }>;
  author?: { id: string; full_name?: string | null; avatar_url?: string | null };
}

export const commentService = {
  async list(targetType: CommentTargetType, targetId: string, limit = 50) {
    console.log('💬 [comments] list', { targetType, targetId, limit });
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, comment_attachments(*), comment_reactions(*)')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        console.error('💬 [comments] list error', error);
        return [] as CommentRecord[];
      }
      const comments = (data as CommentRecord[]) || [];
      // Enrich with author profiles
      const authorIds = Array.from(new Set(comments.map((c) => c.author_id).filter(Boolean)));
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);
        const map: Record<
          string,
          { id: string; full_name?: string | null; avatar_url?: string | null }
        > = {};
        (profiles || []).forEach((p: any) => (map[p.id] = p));
        comments.forEach((c) => (c.author = map[c.author_id]));
      }
      return comments;
    } catch (e) {
      console.error('💬 [comments] list exception', e);
      return [] as CommentRecord[];
    }
  },

  async add(
    targetType: CommentTargetType,
    targetId: string,
    body: string,
    parentId?: string,
    rich?: any,
  ) {
    console.log('💬 [comments] add', { targetType, targetId, parentId });
    const { data: auth } = await supabase.auth.getUser();
    const authorId = auth.user?.id;
    if (!authorId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        target_type: targetType,
        target_id: targetId,
        parent_comment_id: parentId || null,
        author_id: authorId,
        body,
        rich: rich || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    // Best-effort: flush queued comment pushes into notifications (function may not exist yet)
    try {
      // @ts-ignore
      await supabase.rpc('flush_comment_push_to_notifications');
    } catch {}

    // Mentions support: notify any users referenced as @<uuid>
    try {
      const mentionedUserIds = new Set<string>();
      const mentionRegex =
        /@([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
      let m: RegExpExecArray | null;
      while ((m = mentionRegex.exec(body))) {
        if (m[1] && m[1] !== authorId) mentionedUserIds.add(m[1]);
      }
      const message = (body || '(attachment)').slice(0, 120);
      for (const uid of mentionedUserIds) {
        try {
          await notificationService.createNotification(
            uid,
            'mention',
            message,
            targetId,
            { target_type: targetType, comment_id: (data as any).id },
            authorId,
          );
        } catch {}
      }
    } catch {}
    return data as CommentRecord;
  },

  async react(commentId: string, emoji: string) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('comment_reactions')
      .insert({ comment_id: commentId, user_id: userId, emoji });
    if (error) {
      // Toggle off if duplicate
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    }
  },

  async update(commentId: string, body: string) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('comments')
      .update({ body, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', userId);
    if (error) throw error;
  },

  async remove(commentId: string) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', userId);
    if (error) throw error;
  },

  async reply(targetType: CommentTargetType, targetId: string, parentId: string, body: string) {
    return this.add(targetType, targetId, body, parentId);
  },

  async attachLink(commentId: string, url: string) {
    const type = /youtube\.com|youtu\.be/.test(url) ? 'youtube' : 'link';
    const { error } = await supabase
      .from('comment_attachments')
      .insert({ comment_id: commentId, type, url, metadata: null });
    if (error) throw error;
  },

  async attachVideo(commentId: string, file: Blob, path: string, contentType = 'video/mp4') {
    const { data: upload, error: uploadError } = await supabase.storage
      .from('comment_attachments')
      .upload(path, file, { upsert: true, contentType });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
    const { error: relErr } = await supabase
      .from('comment_attachments')
      .insert({ comment_id: commentId, type: 'video', url: pub.publicUrl, metadata: {} });
    if (relErr) throw relErr;
  },

  onRealtime(targetType: CommentTargetType, targetId: string, handler: () => void) {
    const channel = supabase
      .channel(`comments_${targetType}_${targetId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `target_type=eq.${targetType},target_id=eq.${targetId}`,
        },
        handler,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, handler)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_attachments' },
        handler,
      )
      .subscribe((status) => console.log('💬 [comments] realtime status', status));
    return () => supabase.removeChannel(channel);
  },
};
