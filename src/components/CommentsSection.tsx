import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Modal as RNModal,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatDistanceToNow } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { commentService, CommentTargetType } from '../services/commentService';
import { ImageWithFallback } from './ImageWithFallback';
import WebView from 'react-native-webview';
import Constants from 'expo-constants';
import { ReportDialog } from './report/ReportDialog';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';

type Props = {
  targetType: CommentTargetType;
  targetId: string;
};

const EMOJI_OPTIONS = ['👍', '👏', '🔥', '🎉', '💯', '😊'];

type GroupedReaction = { emoji: string; count: number; hasOwn: boolean };

function groupReactions(reactions: any[] | undefined, userId: string | null): GroupedReaction[] {
  if (!reactions?.length) return [];
  const map = new Map<string, { count: number; hasOwn: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.user_id === userId) existing.hasOwn = true;
    } else {
      map.set(r.emoji, { count: 1, hasOwn: r.user_id === userId });
    }
  }
  return Array.from(map.entries()).map(([emoji, { count, hasOwn }]) => ({ emoji, count, hasOwn }));
}

function relativeTime(dateStr: string, lang: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: lang === 'sv' ? sv : enUS,
    });
  } catch {
    return '';
  }
}

export const CommentsSection: React.FC<Props> = ({ targetType, targetId }) => {
  const navigation = useNavigation<any>();
  const { t, language } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const isDark = colorScheme === 'dark';

  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifLoading, setGifLoading] = useState(false);
  const [gifResults, setGifResults] = useState<Array<{ id: string; url: string; thumb: string }>>([]);
  const [gifError, setGifError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; type: string } | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  const gifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Colors based on theme
  const colors = useMemo(
    () => ({
      cardBg: isDark ? '$background' : '$background',
      inputBg: isDark ? '#1E1E1E' : '#F5F5F5',
      inputText: isDark ? '#FFF' : '#000',
      inputPlaceholder: isDark ? '#888' : '#999',
      replyBorder: '#00E6C3',
      avatarFallbackBg: '#00E6C3',
      avatarFallbackText: '#000',
      reactionBg: isDark ? '#2A2A2A' : '#F0F0F0',
      reactionActiveBg: isDark ? '#1A3A30' : '#E0F7F0',
      reactionBorder: '#00E6C3',
      subtleText: isDark ? '#888' : '#999',
      replyCardBg: isDark ? '#1A1A1A' : '#F8F8F8',
      modalBg: isDark ? '#0F172A' : '#FFFFFF',
      pillBg: isDark ? '#333' : '#EEEEEE',
    }),
    [isDark],
  );

  useEffect(() => {
    load();
    const off = commentService.onRealtime(targetType, targetId, () => load(true));
    return () => {
      try {
        off();
      } catch {}
    };
  }, [targetType, targetId]);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (gifOpen && gifResults.length === 0) {
      loadTrendingGifs().catch(() => {});
    }
  }, [gifOpen]);

  const load = async (silent = false) => {
    const data = await commentService.list(targetType, targetId, 50);
    setComments(data);
  };

  const add = async () => {
    if (!body.trim()) return;
    try {
      await commentService.add(targetType, targetId, body.trim(), replyTo || undefined);
      setBody('');
      setReplyTo(null);
      await load(true);
    } catch {}
  };

  const createCommentForAttachment = async (): Promise<string | null> => {
    try {
      const text = body.trim();
      const record = await commentService.add(
        targetType,
        targetId,
        text || '(attachment)',
        replyTo || undefined,
      );
      setBody('');
      setReplyTo(null);
      return record.id;
    } catch {
      return null;
    }
  };

  const attachImage = async (commentId: string) => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const fileName = `c_${commentId}_${Date.now()}.jpg`;
      const file = await fetch(uri).then((r) => r.blob());
      const { data: upload, error: uploadError } = await supabase.storage
        .from('comment_attachments')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const { error: relErr } = await supabase.from('comment_attachments').insert({
        comment_id: commentId,
        type: 'image',
        url: pub.publicUrl,
        metadata: { w: res.assets[0].width, h: res.assets[0].height },
      });
      if (relErr) throw relErr;
      await load(true);
    } catch {} finally {
      setUploading(false);
    }
  };

  const attachCameraPhoto = async (commentId: string) => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const fileName = `c_${commentId}_${Date.now()}.jpg`;
      const file = await fetch(uri).then((r) => r.blob());
      const { data: upload, error: uploadError } = await supabase.storage
        .from('comment_attachments')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const { error: relErr } = await supabase.from('comment_attachments').insert({
        comment_id: commentId,
        type: 'image',
        url: pub.publicUrl,
        metadata: { camera: true },
      });
      if (relErr) throw relErr;
      await load(true);
    } catch {} finally {
      setUploading(false);
    }
  };

  const handleComposerImage = async () => {
    const id = await createCommentForAttachment();
    if (id) await attachImage(id);
  };

  const handleComposerCamera = async () => {
    const id = await createCommentForAttachment();
    if (id) await attachCameraPhoto(id);
  };

  const handleComposerGif = () => setGifOpen(true);

  const openReport = (commentId: string) =>
    setReporting({ id: commentId, type: 'route_comment' });

  const toggleReaction = useCallback(
    async (commentId: string, emoji: string) => {
      await commentService.react(commentId, emoji);
      await load(true);
    },
    [targetType, targetId],
  );

  const handleMoreActions = useCallback(
    (comment: any) => {
      const isOwn = currentUserId && currentUserId === comment.author_id;
      const buttons: any[] = [];

      if (isOwn) {
        buttons.push({
          text: t('comments.edit'),
          onPress: () => {
            setEditingId(comment.id);
            setEditBody(comment.body);
          },
        });
        buttons.push({
          text: t('comments.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('comments.deleteConfirmTitle'), t('comments.deleteConfirmMessage'), [
              { text: t('comments.cancel'), style: 'cancel' },
              {
                text: t('comments.delete'),
                style: 'destructive',
                onPress: async () => {
                  await commentService.remove(comment.id);
                  await load(true);
                },
              },
            ]);
          },
        });
      } else {
        buttons.push({
          text: t('comments.report'),
          style: 'destructive',
          onPress: () => openReport(comment.id),
        });
      }

      buttons.push({ text: t('comments.cancel'), style: 'cancel' });
      Alert.alert(t('comments.moreActions'), undefined, buttons);
    },
    [currentUserId, t],
  );

  const getYouTubeId = (url: string): string | null => {
    const m = url.match(
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,
    );
    return m && m[7] && m[7].length === 11 ? m[7] : null;
  };

  const getGiphyKey = () =>
    (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY ||
    (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;

  const searchGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = getGiphyKey();
      if (!apiKey) {
        setGifError('Missing EXPO_PUBLIC_GIPHY_KEY');
        setGifResults([]);
        return;
      }
      const q = encodeURIComponent(gifQuery || 'reaction');
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=24&rating=g`;
      const res = await fetch(url);
      if (!res.ok) {
        setGifError(`GIPHY error ${res.status}`);
        setGifResults([]);
        return;
      }
      const json = await res.json();
      setGifResults(
        (json.data || []).map((d: any) => ({
          id: d.id,
          url: d.images.original.url,
          thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url,
        })),
      );
    } catch {
      setGifError('Failed to load GIFs');
    } finally {
      setGifLoading(false);
    }
  };

  const loadTrendingGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = getGiphyKey();
      if (!apiKey) {
        setGifError('Missing EXPO_PUBLIC_GIPHY_KEY');
        setGifResults([]);
        return;
      }
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;
      const res = await fetch(url);
      if (!res.ok) {
        setGifError(`GIPHY error ${res.status}`);
        setGifResults([]);
        return;
      }
      const json = await res.json();
      setGifResults(
        (json.data || []).map((d: any) => ({
          id: d.id,
          url: d.images.original.url,
          thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url,
        })),
      );
    } catch {
      setGifError('Failed to load trending GIFs');
    } finally {
      setGifLoading(false);
    }
  };

  const loadRandomGif = async () => {
    try {
      const apiKey = getGiphyKey();
      if (!apiKey) return;
      const url = `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&rating=g`;
      const res = await fetch(url);
      const json = await res.json();
      const d = json.data;
      if (d?.id) {
        setGifResults((prev) => [
          {
            id: d.id,
            url: d.images?.original?.url || d.image_url,
            thumb:
              d.images?.preview_gif?.url || d.images?.fixed_width_small_still?.url || d.image_url,
          },
          ...prev,
        ]);
      }
    } catch {}
  };

  const handleGifDebounce = useCallback(
    (text: string) => {
      setGifQuery(text);
      if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current);
      gifDebounceRef.current = setTimeout(() => searchGifs(), 350);
    },
    [searchGifs],
  );

  const replyToName = useMemo(() => {
    if (!replyTo) return '';
    const c = comments.find((c) => c.id === replyTo);
    return c?.author?.full_name || '';
  }, [replyTo, comments]);

  // --- Render helpers ---

  const renderAvatar = (author: any, size: number) => {
    const radius = size / 2;
    if (author?.avatar_url) {
      return (
        <Image
          source={{ uri: author.avatar_url }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: isDark ? '#333' : '#E5E5E5',
          }}
        />
      );
    }
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.avatarFallbackBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text fontSize={size * 0.5} fontWeight="700" color={colors.avatarFallbackText}>
          {(author?.full_name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderReactions = (comment: any) => {
    const grouped = groupReactions(comment.comment_reactions, currentUserId);
    if (grouped.length === 0 && emojiPickerFor !== comment.id) return null;

    return (
      <XStack gap={4} flexWrap="wrap" marginTop={4}>
        {grouped.map((r) => (
          <TouchableOpacity
            key={r.emoji}
            onPress={() => toggleReaction(comment.id, r.emoji)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: r.hasOwn ? colors.reactionActiveBg : colors.reactionBg,
              borderWidth: r.hasOwn ? 1 : 0,
              borderColor: colors.reactionBorder,
            }}
          >
            <Text fontSize={12}>{r.emoji}</Text>
            <Text fontSize={11} color="$color">
              {r.count}
            </Text>
          </TouchableOpacity>
        ))}
      </XStack>
    );
  };

  const renderEmojiPicker = (commentId: string) => {
    if (emojiPickerFor !== commentId) return null;
    return (
      <XStack
        gap={4}
        padding={6}
        backgroundColor={colors.reactionBg}
        borderRadius={16}
        marginTop={4}
        alignSelf="flex-start"
      >
        {EMOJI_OPTIONS.map((e) => (
          <TouchableOpacity
            key={e}
            onPress={() => {
              toggleReaction(commentId, e);
              setEmojiPickerFor(null);
            }}
            style={{ padding: 4 }}
          >
            <Text fontSize={18}>{e}</Text>
          </TouchableOpacity>
        ))}
      </XStack>
    );
  };

  const renderActionBar = (comment: any) => (
    <XStack gap={16} alignItems="center" marginTop={6}>
      <TouchableOpacity onPress={() => setReplyTo(comment.id)}>
        <Feather name="message-circle" size={15} color={colors.subtleText} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setEmojiPickerFor(emojiPickerFor === comment.id ? null : comment.id)}
      >
        <Feather name="smile" size={15} color={colors.subtleText} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleMoreActions(comment)}>
        <Feather name="more-horizontal" size={15} color={colors.subtleText} />
      </TouchableOpacity>
    </XStack>
  );

  const renderEditForm = (comment: any) => {
    if (editingId !== comment.id) return null;
    return (
      <YStack gap={8} marginTop={8}>
        <TextInput
          value={editBody}
          onChangeText={setEditBody}
          style={{
            backgroundColor: colors.inputBg,
            color: colors.inputText,
            padding: 10,
            borderRadius: 8,
            fontSize: 14,
          }}
          multiline
        />
        <XStack gap={8}>
          <TouchableOpacity
            onPress={async () => {
              if (editBody.trim()) {
                await commentService.update(comment.id, editBody.trim());
                setEditingId(null);
                setEditBody('');
                await load(true);
              }
            }}
            style={{
              backgroundColor: '#00E6C3',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text fontSize={13} fontWeight="600" color="#000">
              {t('comments.save')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditingId(null);
              setEditBody('');
            }}
            style={{
              backgroundColor: colors.pillBg,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text fontSize={13} color="$color">
              {t('comments.cancel')}
            </Text>
          </TouchableOpacity>
        </XStack>
      </YStack>
    );
  };

  const renderAttachments = (attachments: any[]) =>
    attachments?.map((a: any) => (
      <View key={a.id} style={{ marginTop: 8 }}>
        {a.type === 'image' || a.type === 'gif' ? (
          <ImageWithFallback
            source={{
              uri: a.url.includes('/storage/v1/object/public/') ? `${a.url}?download=1` : a.url,
            }}
            style={{
              width: Dimensions.get('window').width - 48,
              height: 160,
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
        ) : a.type === 'youtube' ? (
          (() => {
            const vid = getYouTubeId(a.url);
            const width = Dimensions.get('window').width - 48;
            const height = Math.round(width * 0.5625);
            return vid ? (
              <View style={{ width, height, borderRadius: 8, overflow: 'hidden' }}>
                <WebView
                  source={{ uri: `https://www.youtube.com/embed/${vid}` }}
                  style={{ flex: 1 }}
                  allowsFullscreenVideo
                  javaScriptEnabled
                />
              </View>
            ) : (
              <Text color="$gray11">YouTube: {a.url}</Text>
            );
          })()
        ) : a.type === 'video' ? (
          <Text color="$gray11">Video: {a.url}</Text>
        ) : (
          <Text color="$blue10">{a.url}</Text>
        )}
      </View>
    ));

  const renderComment = (c: any, isReply = false) => {
    const avatarSize = isReply ? 22 : 28;

    return (
      <YStack
        key={c.id}
        padding={8}
        backgroundColor={isReply ? undefined : colors.cardBg}
        borderRadius={8}
        marginBottom={isReply ? 0 : 8}
        {...(isReply && {
          marginTop: 8,
          marginLeft: 12,
          paddingLeft: 12,
          borderLeftWidth: 2,
          borderLeftColor: colors.replyBorder,
          backgroundColor: colors.replyCardBg,
          borderRadius: 8,
        })}
      >
        <XStack alignItems="center" gap={8}>
          <TouchableOpacity
            onPress={() =>
              c.author?.id && navigation.navigate('PublicProfile', { userId: c.author.id })
            }
          >
            {renderAvatar(c.author, avatarSize)}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              c.author?.id && navigation.navigate('PublicProfile', { userId: c.author.id })
            }
          >
            <Text fontSize={isReply ? 12 : 13} fontWeight="600" color="$color">
              {c.author?.full_name || 'Unknown'}
            </Text>
          </TouchableOpacity>
          <Text fontSize={isReply ? 10 : 11} color="$gray11">
            {relativeTime(c.created_at, language)}
          </Text>
        </XStack>

        {!(c.body === '(attachment)' && (c.comment_attachments?.length || 0) > 0) && (
          <Text color="$color" marginTop={4} fontSize={14} lineHeight={20}>
            {c.body}
          </Text>
        )}

        {renderEditForm(c)}
        {renderAttachments(c.comment_attachments)}
        {renderReactions(c)}
        {renderEmojiPicker(c.id)}
        {renderActionBar(c)}
      </YStack>
    );
  };

  const renderReplies = (parentId: string) => {
    const replies = comments.filter((r) => r.parent_comment_id === parentId);
    if (replies.length === 0) return null;
    const isOpen = !!expanded[parentId];
    const replyText =
      replies.length === 1
        ? t('comments.viewReplies').replace('{{count}}', '1')
        : t('comments.viewRepliesPlural').replace('{{count}}', String(replies.length));

    return (
      <YStack>
        <TouchableOpacity
          onPress={() => setExpanded((p) => ({ ...p, [parentId]: !isOpen }))}
          style={{ marginTop: 6 }}
        >
          <Text fontSize={12} fontWeight="500" color="#00E6C3">
            {isOpen ? t('comments.hideReplies') : replyText}
          </Text>
        </TouchableOpacity>
        {isOpen && replies.map((r) => renderComment(r, true))}
      </YStack>
    );
  };

  return (
    <YStack gap={12} marginTop={16}>
      <Text fontSize={18} fontWeight="bold" color="$color">
        {t('comments.title')}
      </Text>

      <YStack backgroundColor="$backgroundStrong" borderRadius={12} padding={12} gap={4}>
        {comments.length === 0 ? (
          <Text color="$gray11" paddingVertical={8}>
            {t('comments.beFirstToComment')}
          </Text>
        ) : (
          comments
            .filter((c) => !c.parent_comment_id)
            .map((c) => (
              <YStack key={c.id}>
                {renderComment(c)}
                {renderReplies(c.id)}
              </YStack>
            ))
        )}
      </YStack>

      {/* Composer */}
      <YStack gap={6}>
        {replyTo && (
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={12}
            paddingVertical={6}
            backgroundColor={colors.replyCardBg}
            borderRadius={8}
            borderLeftWidth={3}
            borderLeftColor={colors.replyBorder}
          >
            <Text fontSize={12} color="$gray11">
              {t('comments.replyingTo').replace('{{name}}', replyToName)}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Feather name="x" size={14} color={colors.subtleText} />
            </TouchableOpacity>
          </XStack>
        )}
        <XStack
          alignItems="center"
          gap={8}
          backgroundColor={colors.inputBg}
          borderRadius={22}
          paddingHorizontal={14}
          paddingVertical={4}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('comments.writeComment')}
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              flex: 1,
              color: colors.inputText,
              fontSize: 14,
              paddingVertical: 8,
            }}
            returnKeyType="send"
            onSubmitEditing={add}
          />
          <TouchableOpacity onPress={handleComposerCamera} disabled={uploading}>
            <Feather name="camera" size={18} color={colors.subtleText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComposerImage} disabled={uploading}>
            <Feather name="image" size={18} color={colors.subtleText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComposerGif} disabled={uploading}>
            <Text fontSize={12} fontWeight="700" color={colors.subtleText}>
              GIF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={add}
            disabled={!body.trim()}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: body.trim() ? '#00E6C3' : colors.pillBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="arrow-up" size={16} color={body.trim() ? '#000' : colors.subtleText} />
          </TouchableOpacity>
        </XStack>
        {uploading && (
          <XStack alignItems="center" gap={8} paddingHorizontal={12}>
            <ActivityIndicator size="small" color="#00E6C3" />
            <Text fontSize={12} color="$gray11">
              Uploading…
            </Text>
          </XStack>
        )}
      </YStack>

      {/* GIF Picker Modal */}
      <RNModal visible={gifOpen} animationType="slide" onRequestClose={() => setGifOpen(false)}>
        <YStack flex={1} backgroundColor={colors.modalBg} padding={16} gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={18} fontWeight="bold" color="$color">
              {t('comments.chooseGif')}
            </Text>
            <TouchableOpacity onPress={() => setGifOpen(false)}>
              <Feather name="x" size={22} color={colors.subtleText} />
            </TouchableOpacity>
          </XStack>
          <XStack
            alignItems="center"
            gap={8}
            backgroundColor={colors.inputBg}
            borderRadius={10}
            paddingHorizontal={12}
          >
            <Feather name="search" size={16} color={colors.subtleText} />
            <TextInput
              value={gifQuery}
              onChangeText={handleGifDebounce}
              placeholder={t('comments.searchGifs')}
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                flex: 1,
                color: colors.inputText,
                paddingVertical: 10,
                fontSize: 14,
              }}
              onSubmitEditing={searchGifs}
            />
          </XStack>
          <XStack gap={8}>
            {[
              { label: t('comments.trending'), onPress: loadTrendingGifs },
              { label: t('comments.random'), onPress: loadRandomGif },
              { label: t('comments.search'), onPress: searchGifs },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={btn.onPress}
                style={{
                  backgroundColor: colors.pillBg,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                }}
              >
                <Text fontSize={13} color="$color">
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>
          {gifLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <ActivityIndicator color="#00E6C3" />
            </YStack>
          ) : (
            <>
              {gifError && <Text color="#EF4444">{gifError}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {gifResults.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={async () => {
                      try {
                        const id = await createCommentForAttachment();
                        if (!id) return;
                        const { error } = await supabase.from('comment_attachments').insert({
                          comment_id: id,
                          type: 'image',
                          url: g.url,
                          metadata: { source: 'giphy', id: g.id, format: 'gif' },
                        } as any);
                      } catch {} finally {
                        setGifOpen(false);
                        setGifResults([]);
                        setGifQuery('');
                        await load(true);
                      }
                    }}
                    style={{ marginRight: 8, marginBottom: 8 }}
                  >
                    <Image
                      source={{ uri: g.thumb }}
                      style={{
                        width: 104,
                        height: 104,
                        borderRadius: 8,
                        backgroundColor: isDark ? '#111' : '#E5E5E5',
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </YStack>
      </RNModal>

      {/* Report Modal */}
      {reporting && (
        <ReportDialog
          reportableId={reporting.id}
          reportableType={reporting.type as any}
          onClose={() => setReporting(null)}
        />
      )}
    </YStack>
  );
};
