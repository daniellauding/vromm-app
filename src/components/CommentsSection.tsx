import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Image, Linking, Modal as RNModal, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { commentService, CommentTargetType } from '../services/commentService';
import WebView from 'react-native-webview';
import { ImageWithFallback } from './ImageWithFallback';
import Constants from 'expo-constants';
import { ReportDialog } from './report/ReportDialog';

type Props = {
  targetType: CommentTargetType;
  targetId: string;
};

export const CommentsSection: React.FC<Props> = ({ targetType, targetId }) => {
  const navigation = useNavigation<any>();
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
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch {}
    })();
  }, []);

  // Preload trending when GIF modal opens
  useEffect(() => {
    if (gifOpen) {
      console.log('💬 [GIF] modal opened');
      if (gifResults.length === 0) {
        loadTrendingGifs().catch((e) => console.log('💬 [GIF] trending error', e));
      }
    }
  }, [gifOpen]);

  const load = async (silent = false) => {
    if (!silent) console.log('💬 [CommentsSection] load', { targetType, targetId });
    const data = await commentService.list(targetType, targetId, 50);
    console.log('💬 [comments] loaded', {
      count: data?.length || 0,
      first: data?.[0]?.id,
      attachments: data?.flatMap((c:any)=>c.comment_attachments||[]).map((a:any)=>({id:a.id,type:a.type,url:a.url}))
    });
    setComments(data);
  };

  const add = async () => {
    if (!body.trim()) return;
    try {
      await commentService.add(targetType, targetId, body.trim(), replyTo || undefined);
      setBody('');
      setReplyTo(null);
      await load(true);
    } catch (e) {
      console.error('💬 [CommentsSection] add error', e);
    }
  };

  const attachImage = async (commentId: string) => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const fileName = `c_${commentId}_${Date.now()}.jpg`;
      const file = await fetch(uri).then(r => r.blob());

      const { data: upload, error: uploadError } = await supabase.storage
        .from('comment_attachments')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);

      const { error: relErr } = await supabase
        .from('comment_attachments')
        .insert({ comment_id: commentId, type: 'image', url: pub.publicUrl, metadata: { w: res.assets[0].width, h: res.assets[0].height } });
      if (relErr) throw relErr;

      await load(true);
    } catch (e) {
      console.error('💬 [CommentsSection] attachImage error', e);
    } finally {
      setUploading(false);
    }
  };
  const createCommentForAttachment = async (): Promise<string | null> => {
    try {
      const text = body.trim();
      const record = await commentService.add(targetType, targetId, text || '(attachment)', replyTo || undefined);
      setBody('');
      setReplyTo(null);
      return record.id;
    } catch (e) {
      console.error('💬 [CommentsSection] createCommentForAttachment error', e);
      return null;
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

  const handleComposerVideo = async () => {
    const id = await createCommentForAttachment();
    if (id) await attachVideo(id);
  };

  const handleComposerGif = async () => {
    setGifOpen(true);
  };

  const openReport = (commentId: string) => setReporting({ id: commentId, type: `${targetType}_comment` });

  const Emoji = ({ onPick }: { onPick: (e: string) => void }) => (
    <XStack gap={6}>
      {['👍','👏','🔥','🎉','💯','😊'].map(e => (
        <TouchableOpacity key={e} onPress={() => onPick(e)}><Text>{e}</Text></TouchableOpacity>
      ))}
    </XStack>
  );

  const attachVideo = async (commentId: string) => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const fileName = `c_${commentId}_${Date.now()}.mp4`;
      const file = await fetch(uri).then(r => r.blob());

      const { data: upload, error: uploadError } = await supabase.storage
        .from('comment_attachments')
        .upload(fileName, file, { upsert: true, contentType: 'video/mp4' });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const { error: relErr } = await supabase
        .from('comment_attachments')
        .insert({ comment_id: commentId, type: 'video', url: pub.publicUrl, metadata: {} });
      if (relErr) throw relErr;

      await load(true);
    } catch (e) {
      console.error('💬 [CommentsSection] attachVideo error', e);
    } finally {
      setUploading(false);
    }
  };

  const attachCameraPhoto = async (commentId: string) => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const fileName = `c_${commentId}_${Date.now()}.jpg`;
      const file = await fetch(uri).then(r => r.blob());
      const { data: upload, error: uploadError } = await supabase.storage
        .from('comment_attachments')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const { error: relErr } = await supabase
        .from('comment_attachments')
        .insert({ comment_id: commentId, type: 'image', url: pub.publicUrl, metadata: { camera: true } });
      if (relErr) throw relErr;
      await load(true);
    } catch (e) {
      console.error('💬 [CommentsSection] attachCameraPhoto error', e);
    } finally {
      setUploading(false);
    }
  };

  // Link attachment: for now, paste a URL into the comment body or use a separate admin tool.

  const getYouTubeId = (url: string): string | null => {
    const m = url.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
    return m && m[7] && m[7].length === 11 ? m[7] : null;
  };

  const searchGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;
      console.log('💬 [GIF] searching', { q: gifQuery, hasKey: !!apiKey });
      if (!apiKey) {
        setGifError('Missing EXPO_PUBLIC_GIPHY_KEY');
        setGifResults([]);
        return;
      }
      const q = encodeURIComponent(gifQuery || 'reaction');
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=24&rating=g`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        console.log('💬 [GIF] fetch failed', res.status, txt);
        setGifError(`GIPHY error ${res.status}`);
        setGifResults([]);
        return;
      }
      const json = await res.json();
      const items = (json.data || []).map((d: any) => ({ id: d.id, url: d.images.original.url, thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url }));
      console.log('💬 [GIF] results', items.length);
      setGifResults(items);
    } catch (e) {
      console.error('💬 [CommentsSection] giphy search error', e);
      setGifError('Failed to load GIFs');
    } finally {
      setGifLoading(false);
    }
  };

  const loadTrendingGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;
      console.log('💬 [GIF] trending', { hasKey: !!apiKey });
      if (!apiKey) {
        setGifError('Missing EXPO_PUBLIC_GIPHY_KEY');
        setGifResults([]);
        return;
      }
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        console.log('💬 [GIF] trending failed', res.status, txt);
        setGifError(`GIPHY error ${res.status}`);
        setGifResults([]);
        return;
      }
      const json = await res.json();
      const items = (json.data || []).map((d: any) => ({ id: d.id, url: d.images.original.url, thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url }));
      console.log('💬 [GIF] trending results', items.length);
      setGifResults(items);
    } catch (e) {
      console.error('💬 [CommentsSection] giphy trending error', e);
      setGifError('Failed to load trending GIFs');
    } finally {
      setGifLoading(false);
    }
  };

  const loadRandomGif = async () => {
    try {
      const apiKey = (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;
      if (!apiKey) return;
      const url = `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&rating=g`;
      const res = await fetch(url);
      const json = await res.json();
      const d = json.data;
      if (d?.id) {
        const item = { id: d.id, url: d.images?.original?.url || d.image_url, thumb: d.images?.preview_gif?.url || d.images?.fixed_width_small_still?.url || d.image_url };
        setGifResults((prev) => [item, ...prev]);
        console.log('💬 [GIF] random add', item.id);
      }
    } catch (e) {
      console.log('💬 [GIF] random error', e);
    }
  };

  return (
    <YStack gap={12} marginTop={16}>
      <Text fontSize={18} fontWeight="bold" color="$color">Comments</Text>

      <YStack backgroundColor="$backgroundStrong" borderRadius={12} padding={12} gap={8}>
        {comments.length === 0 ? (
          <Text color="$gray11">Be the first to comment</Text>
        ) : (
          comments
            .filter((c) => !c.parent_comment_id)
            .map((c) => (
              <YStack key={c.id} padding={8} backgroundColor="$background" borderRadius={8} marginBottom={8}>
                <XStack alignItems="center" gap={8}>
                  <TouchableOpacity onPress={() => c.author?.id && navigation.navigate('PublicProfile', { userId: c.author.id })}>
                    {c.author?.avatar_url ? (
                      <Image source={{ uri: c.author.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                    ) : (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                        <Text fontSize={12} color="#aaa">{(c.author?.full_name || 'U')[0]}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => c.author?.id && navigation.navigate('PublicProfile', { userId: c.author.id })}>
                    <Text fontWeight="600" color="$color">{c.author?.full_name || 'Unknown'}</Text>
                  </TouchableOpacity>
                  <Text fontSize={11} color="$gray11">{new Date(c.created_at).toLocaleString()}</Text>
                </XStack>

                {!(c.body === '(attachment)' && (c.comment_attachments?.length || 0) > 0) && (
                  <Text color="$color" marginTop={2}>{c.body}</Text>
                )}
                {editingId === c.id && (
                  <YStack gap={8} marginTop={8}>
                    <TextInput
                      value={editBody}
                      onChangeText={setEditBody}
                      style={{ backgroundColor: '#222', color: 'white', padding: 10, borderRadius: 8 }}
                      multiline
                    />
                    <XStack gap={8}>
                      <Button size="$2" onPress={async () => { if (editBody.trim()) { await commentService.update(c.id, editBody.trim()); setEditingId(null); setEditBody(''); await load(true); } }}>Save</Button>
                      <Button size="$2" backgroundColor="#333" onPress={() => { setEditingId(null); setEditBody(''); }}>Cancel</Button>
                    </XStack>
                  </YStack>
                )}

                {c.comment_attachments?.map((a: any) => (
                  <View key={a.id} style={{ marginTop: 8 }}>
                    {(() => { console.log('💬 [render] attachment', {id:a.id,type:a.type,url:a.url}); return null; })()}
                    {a.type === 'image' || a.type === 'gif' ? (
                      <ImageWithFallback
                        source={{ uri: a.url.includes('/storage/v1/object/public/') ? `${a.url}?download=1` : a.url }}
                        style={{ width: Dimensions.get('window').width - 48, height: 160, borderRadius: 8 }}
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
                ))}

                <XStack justifyContent="space-between" alignItems="center" marginTop={8}>
                  <XStack gap={10} alignItems="center">
                    <Emoji onPick={(e) => commentService.react(c.id, e)} />
                    <TouchableOpacity onPress={() => setReplyTo(c.id)}>
                      <Text fontSize={12} color="#8B5CF6">Reply</Text>
                    </TouchableOpacity>
                    {currentUserId && currentUserId === c.author_id && (
                      <>
                        <TouchableOpacity onPress={() => { setEditingId(c.id); setEditBody(c.body); }}>
                          <Text fontSize={12} color="#888">Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: async () => { await commentService.remove(c.id); await load(true); } },
                          ]);
                        }}>
                          <Text fontSize={12} color="#EF4444">Delete</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity onPress={() => openReport(c.id)}>
                      <Text fontSize={12} color="#EF4444">Report</Text>
                    </TouchableOpacity>
                  </XStack>
                </XStack>

                {(() => {
                  const replies = comments.filter((r) => r.parent_comment_id === c.id);
                  if (replies.length === 0) return null;
                  const isOpen = !!expanded[c.id];
                  return (
                    <YStack>
                      <TouchableOpacity onPress={() => setExpanded((p) => ({ ...p, [c.id]: !isOpen }))}>
                        <Text fontSize={12} color="#8B5CF6" marginTop={8}>
                          {isOpen ? 'Hide replies' : `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
                        </Text>
                      </TouchableOpacity>
                      {isOpen && replies.map((r) => (
                        <YStack key={r.id} padding={8} marginTop={8} marginLeft={16} backgroundColor="#111" borderRadius={8}>
                          <XStack alignItems="center" gap={8}>
                            {r.author?.avatar_url ? (
                              <Image source={{ uri: r.author.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                            ) : (
                              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                <Text fontSize={10} color="#aaa">{(r.author?.full_name || 'U')[0]}</Text>
                              </View>
                            )}
                            <Text fontSize={12} fontWeight="600" color="$color">{r.author?.full_name || 'Unknown'}</Text>
                            <Text fontSize={10} color="$gray11">{new Date(r.created_at).toLocaleString()}</Text>
                          </XStack>
                          <Text color="$color" marginTop={2}>{r.body}</Text>
                          {editingId === r.id && (
                            <YStack gap={8} marginTop={8}>
                              <TextInput
                                value={editBody}
                                onChangeText={setEditBody}
                                style={{ backgroundColor: '#222', color: 'white', padding: 10, borderRadius: 8 }}
                                multiline
                              />
                              <XStack gap={8}>
                                <Button size="$2" onPress={async () => { if (editBody.trim()) { await commentService.update(r.id, editBody.trim()); setEditingId(null); setEditBody(''); await load(true); } }}>Save</Button>
                                <Button size="$2" backgroundColor="#333" onPress={() => { setEditingId(null); setEditBody(''); }}>Cancel</Button>
                              </XStack>
                            </YStack>
                          )}
                          {currentUserId && currentUserId === r.author_id && (
                            <XStack gap={12} marginTop={6}>
                              <TouchableOpacity onPress={() => { setEditingId(r.id); setEditBody(r.body); }}>
                                <Text fontSize={12} color="#888">Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => {
                                Alert.alert('Delete comment', 'Delete this reply?', [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: async () => { await commentService.remove(r.id); await load(true); } },
                                ]);
                              }}>
                                <Text fontSize={12} color="#EF4444">Delete</Text>
                              </TouchableOpacity>
                            </XStack>
                          )}
                        </YStack>
                      ))}
                    </YStack>
                  );
                })()}
              </YStack>
            ))
        )}
      </YStack>

      <YStack gap={8}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write a comment…"
          placeholderTextColor="#888"
          style={{ backgroundColor: '#222', color: 'white', padding: 12, borderRadius: 8 }}
          returnKeyType="send"
          onSubmitEditing={add}
        />
        {replyTo && (
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={12} color="#8B5CF6">Replying…</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}><Text color="#888">Cancel</Text></TouchableOpacity>
          </XStack>
        )}
        <XStack gap={8} justifyContent="flex-end">
          <Button size="$2" onPress={handleComposerImage} disabled={uploading}>Image</Button>
          <Button size="$2" onPress={handleComposerCamera} disabled={uploading}>Camera</Button>
          <Button size="$2" onPress={handleComposerVideo} disabled={uploading}>Video</Button>
          <Button size="$2" onPress={handleComposerGif} disabled={uploading}>GIF</Button>
        </XStack>
        <Button backgroundColor="#00E6C3" color="#000" onPress={add} disabled={!body.trim()}>
          Post Comment
        </Button>
      </YStack>

      {/* GIF Picker Modal */}
      <RNModal visible={gifOpen} animationType="slide" onRequestClose={() => setGifOpen(false)}>
        <YStack flex={1} backgroundColor="#0F172A" padding={16} gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={18} fontWeight="bold" color="$color">Choose a GIF</Text>
            <TouchableOpacity onPress={() => setGifOpen(false)}>
              <Text color="#888">Close</Text>
            </TouchableOpacity>
          </XStack>
          <TextInput
            value={gifQuery}
            onChangeText={(t) => {
              setGifQuery(t);
              // debounce live search
              (searchGifs as any)._t && clearTimeout((searchGifs as any)._t);
              (searchGifs as any)._t = setTimeout(() => searchGifs(), 350);
            }}
            placeholder="Search GIFs"
            placeholderTextColor="#666"
            style={{ backgroundColor: '#222', color: 'white', padding: 12, borderRadius: 8 }}
            onSubmitEditing={searchGifs}
          />
          <XStack gap={8} justifyContent="flex-end">
            <TouchableOpacity onPress={loadTrendingGifs} style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text color="#fff">Trending</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadRandomGif} style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text color="#fff">Random</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={searchGifs} style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text color="#fff">Search</Text>
            </TouchableOpacity>
          </XStack>
          {gifLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <ActivityIndicator color="#00E6C3" />
            </YStack>
          ) : (
            <>
              {gifError && (
                <Text color="#EF4444">{gifError}</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {gifResults.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={async () => {
                      try {
                        console.log('💬 [GIF] pick', g.id, g.url);
                        const id = await createCommentForAttachment();
                        if (!id) return;
                        // Use type 'image' to satisfy enum; mark metadata.format='gif'
                        const insertPayload = { comment_id: id, type: 'image', url: g.url, metadata: { source: 'giphy', id: g.id, format: 'gif' } } as any;
                        const { error } = await supabase
                          .from('comment_attachments')
                          .insert(insertPayload);
                        if (error) console.log('💬 [GIF] insert error', error);
                        else console.log('💬 [GIF] insert ok', insertPayload);
                      } catch (e) {
                        console.log('💬 [GIF] exception', e);
                      } finally {
                        setGifOpen(false);
                        setGifResults([]);
                        setGifQuery('');
                        await load(true);
                      }
                    }}
                    style={{ marginRight: 8, marginBottom: 8 }}
                  >
                    <Image source={{ uri: g.thumb }} style={{ width: 104, height: 104, borderRadius: 8, backgroundColor: '#111' }} />
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


