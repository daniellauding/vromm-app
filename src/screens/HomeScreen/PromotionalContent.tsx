import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, TouchableOpacity, useColorScheme, Image, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { SectionHeader } from '../../components/SectionHeader';
import { Feather } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

interface Promotion {
  id: string;
  title: { en: string; sv: string };
  body: { en: string; sv: string };
  icon: string | null;
  icon_color: string | null;
  image_url: string | null;
  youtube_embed: string | null;
  media_type: string | null;
  order_index: number;
}

interface PromotionalContentProps {
  onPromotionPress: (promotion: Promotion) => void;
}

// Extract YouTube video ID from URL (reused from ProgressScreen)
const getYouTubeVideoId = (url: string | null): string | null => {
  if (!url) return null;

  // Try standard regex first
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[7] && match[7].length === 11) {
    return match[7];
  }

  // Try alternative extraction methods
  try {
    const urlObj = new URL(url);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.length === 11) return lastPart;
    }
  } catch {
    // URL parsing failed
  }

  return null;
};

export const PromotionalContent = React.memo(function PromotionalContent({
  onPromotionPress,
}: PromotionalContentProps) {
  const { t, language: lang } = useTranslation();
  const colorScheme = useColorScheme();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = useCallback(async () => {
    const startTime = Date.now();
    console.log('📢 [PromotionalContent] Fetching featured promotions...');

    try {
      const { data, error } = await supabase
        .from('content')
        .select(
          'id, title, body, icon, icon_color, image_url, youtube_embed, media_type, order_index',
        )
        .eq('content_type', 'promotion')
        .eq('is_featured', true)
        .eq('active', true)
        .contains('platforms', ['mobile'])
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ [PromotionalContent] Error fetching promotions:', error);
        return;
      }

      console.log(
        `✅ [PromotionalContent] Fetched ${data?.length || 0} promotions in ${Date.now() - startTime}ms`,
      );
      setPromotions(data || []);
    } catch (error) {
      console.error('❌ [PromotionalContent] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  if (loading) {
    return null;
  }

  if (!promotions || promotions.length === 0) {
    return null;
  }

  return (
    <YStack marginBottom="$4">
      <SectionHeader
        title={
          t('home.promotions') || (lang === 'sv' ? 'Nyheter & Kampanjer' : 'News & Promotions')
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {promotions.map((promotion) => {
          const videoId = getYouTubeVideoId(promotion.youtube_embed);
          const hasMedia = !!promotion.image_url || !!videoId;

          return (
            <TouchableOpacity
              key={promotion.id}
              onPress={() => onPromotionPress(promotion)}
              activeOpacity={0.8}
              style={{
                width: 280,
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <YStack>
                {/* Media Section - Image or YouTube */}
                {hasMedia && (
                  <View style={{ width: '100%', height: 160 }}>
                    {promotion.image_url ? (
                      <Image
                        source={{ uri: promotion.image_url }}
                        style={{
                          width: '100%',
                          height: '100%',
                          resizeMode: 'cover',
                        }}
                      />
                    ) : videoId ? (
                      <YoutubePlayer
                        height={160}
                        videoId={videoId}
                        play={false}
                        webViewProps={{
                          androidLayerType: 'hardware',
                        }}
                      />
                    ) : null}
                  </View>
                )}

                {/* Content Section */}
                <YStack padding={16} gap={12}>
                  {/* Icon and Title */}
                  <XStack alignItems="center" gap={12}>
                    {promotion.icon && (
                      <YStack
                        width={40}
                        height={40}
                        borderRadius={20}
                        backgroundColor={promotion.icon_color || '#00E6C3'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Feather
                          name={promotion.icon as keyof typeof Feather.glyphMap}
                          size={20}
                          color="white"
                        />
                      </YStack>
                    )}
                    <Text
                      fontSize={16}
                      fontWeight="bold"
                      color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                      flex={1}
                      numberOfLines={2}
                    >
                      {promotion.title[lang] || promotion.title.en}
                    </Text>
                  </XStack>

                  {/* Body Preview */}
                  {promotion.body && (promotion.body[lang] || promotion.body.en) && (
                    <Text
                      fontSize={14}
                      color={colorScheme === 'dark' ? '#98989D' : '#6C6C70'}
                      numberOfLines={3}
                    >
                      {promotion.body[lang] || promotion.body.en}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </YStack>
  );
});
