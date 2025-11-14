import React, { useEffect, useState } from 'react';
import { View, Dimensions, Animated, Pressable, Image, TouchableOpacity, Linking } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Button } from './Button';
import YoutubePlayer from 'react-native-youtube-iframe';

interface PromotionContent {
  id: string;
  title: { en: string; sv: string };
  body: { en: string; sv: string };
  image_url?: string | null;
  images?: Record<string, string> | null;
  has_language_images?: boolean;
  youtube_url?: string | null;
  youtube_embed?: string | null;
  youtube_embeds?: Record<string, string> | null;
  has_language_youtube?: boolean;
  is_modal?: boolean;
  modal_actions?: string[];
  modal_action_urls?: Record<string, string>; // Map of action -> URL for external links
}

interface PromotionModalProps {
  visible: boolean;
  onClose: () => void;
  content: PromotionContent | null;
  onActionPress?: (action: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export function PromotionModal({
  visible,
  onClose,
  content,
  onActionPress,
  onNext,
  onPrevious,
  currentIndex = 0,
  totalCount = 1,
}: PromotionModalProps) {
  const { language: lang } = useTranslation();
  const colorScheme = useColorScheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const hasAnimatedRef = React.useRef(false);
  const lastContentIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (visible && content) {
      // Only animate on initial show or when content changes, not when navigating between modals
      const isNewContent = lastContentIdRef.current !== content.id;
      
      if (isNewContent || !hasAnimatedRef.current) {
        // Reset animations first
        scaleAnim.setValue(0);
        fadeAnim.setValue(0);
        hasAnimatedRef.current = true;
        lastContentIdRef.current = content.id;
        
        // Entrance animation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      // Reset animations only when closing
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      hasAnimatedRef.current = false;
      lastContentIdRef.current = null;
    }
    // Only depend on visible and content.id to avoid re-animating on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, content?.id]);

  const handleActionPress = async (action: string) => {
    // Handle external URL actions
    if (action.startsWith('external_url:') && content?.modal_action_urls) {
      // Extract the key from action (e.g., "external_url:website" -> "website")
      const urlKey = action.replace('external_url:', '');
      const url = content.modal_action_urls[urlKey] || content.modal_action_urls[action];
      if (url) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            // Track external URL click
            if (onActionPress) {
              onActionPress(action);
            }
            onClose();
            return;
          }
        } catch (error) {
          console.error('Error opening external URL:', error);
        }
      }
    }
    
    onClose();
    
    // Always call the custom handler - AppContent will handle navigation
    if (onActionPress) {
      onActionPress(action);
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, { en: string; sv: string }> = {
      open_feedback: { en: 'Open Feedback', sv: 'Öppna Feedback' },
      open_mapview: { en: 'Open Map View', sv: 'Öppna Karta' },
      open_progress: { en: 'Open Progress', sv: 'Öppna Framsteg' },
      create_route: { en: 'Create Route', sv: 'Skapa Rutt' },
      record_route: { en: 'Record Route', sv: 'Spela In Rutt' },
      select_role: { en: 'Select Role', sv: 'Välj Roll' },
      select_connection: { en: 'Select Connection', sv: 'Välj Anslutning' },
      buy_me_a_coffee: { en: 'Buy Me a Coffee', sv: 'Köp en Kaffe' },
      external_url: { en: 'Open Link', sv: 'Öppna Länk' },
    };
    const label = labels[action] || { en: action, sv: action };
    return label[lang as 'en' | 'sv'] || label.en;
  };

  const getActionIcon = (action: string): string => {
    const icons: Record<string, string> = {
      open_feedback: 'message-square',
      open_mapview: 'map',
      open_progress: 'trending-up',
      create_route: 'plus-circle',
      record_route: 'video',
      select_role: 'user',
      select_connection: 'users',
      buy_me_a_coffee: 'coffee',
      external_url: 'external-link',
    };
    return icons[action] || 'arrow-right';
  };

  // Memoize computed values to avoid recalculation on every render
  const title = React.useMemo(() => {
    if (!content) return '';
    return content.title[lang as 'en' | 'sv'] || content.title.en || '';
  }, [content, lang]);

  const body = React.useMemo(() => {
    if (!content) return '';
    return content.body[lang as 'en' | 'sv'] || content.body.en || '';
  }, [content, lang]);

  const imageUrl = React.useMemo(() => {
    if (!content) return null;
    return content.has_language_images && content.images
      ? content.images[lang as 'en' | 'sv'] || content.images.en
      : content.image_url;
  }, [content, lang]);

  const youtubeUrl = React.useMemo(() => {
    if (!content) return null;
    if (content.has_language_youtube && content.youtube_embeds) {
      return content.youtube_embeds[lang as 'en' | 'sv'] || content.youtube_embeds.en || null;
    }
    return content.youtube_embed || content.youtube_url || null;
  }, [content, lang]);

  const getYouTubeVideoId = React.useCallback((url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[7] && match[7].length === 11) {
      return match[7];
    }
    return null;
  }, []);

  const youtubeVideoId = React.useMemo(() => {
    return getYouTubeVideoId(youtubeUrl);
  }, [youtubeUrl, getYouTubeVideoId]);

  if (!visible || !content) return null;

  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        opacity: fadeAnim,
      }}
    >
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        intensity={10}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        pointerEvents="none"
      />
      <Pressable
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          width: '100%',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            width="90%"
            minWidth={youtubeVideoId ? 400 : 320}
            maxWidth={400}
            backgroundColor="transparent"
            justifyContent="center"
            alignItems="center"
          >
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                width: '100%',
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                paddingVertical="$4"
                paddingTop="$0"
                overflow="hidden"
                paddingHorizontal="$0"
                borderRadius="$4"
                width="100%"
                gap="$3"
                borderColor={borderColor}
                borderWidth={1}
              >
                {/* Header Image or YouTube Video */}
                {(imageUrl || youtubeVideoId) && (
                  <YStack
                    alignItems="center"
                    backgroundColor="rgba(0, 230, 195, 0.1)"
                    position="relative"
                  >
                    {youtubeVideoId ? (
                      <View
                        style={{
                          width: '100%',
                          height: 200,
                          backgroundColor: '#000',
                        }}
                      >
                        <YoutubePlayer
                          height={200}
                          videoId={youtubeVideoId}
                          play={false}
                          mute={true}
                          webViewProps={{
                            androidLayerType: 'hardware',
                          }}
                        />
                      </View>
                    ) : imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={{
                          width: '100%',
                          height: 200,
                        }}
                        resizeMode="cover"
                        fadeDuration={0}
                      />
                    ) : null}

                    {/* Navigation Arrows - Left */}
                    {totalCount > 1 && onPrevious && currentIndex > 0 && (
                      <Pressable
                        onPress={onPrevious}
                        style={{
                          position: 'absolute',
                          top: 100,
                          left: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          borderRadius: 20,
                          width: 40,
                          height: 40,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="chevron-left" size={24} color="white" />
                      </Pressable>
                    )}

                    {/* Navigation Arrows - Right */}
                    {totalCount > 1 && onNext && (
                      <Pressable
                        onPress={onNext}
                        style={{
                          position: 'absolute',
                          top: 100,
                          right: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          borderRadius: 20,
                          width: 40,
                          height: 40,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="chevron-right" size={24} color="white" />
                      </Pressable>
                    )}

                    {/* Page Indicator */}
                    {totalCount > 1 && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          left: 0,
                          right: 0,
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                            {currentIndex + 1} / {totalCount}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Close button */}
                    <Pressable
                      onPress={onClose}
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="x" size={24} color="white" />
                    </Pressable>
                  </YStack>
                )}

                {/* Content */}
                <YStack paddingHorizontal="$4" gap="$3" paddingBottom="$4">
                  {/* Title */}
                  {!imageUrl && !youtubeVideoId && (
                    <XStack alignItems="center" justifyContent="space-between" marginBottom="$2" position="relative">
                      {/* Navigation Arrows - Left (when no image) */}
                      {totalCount > 1 && onPrevious && currentIndex > 0 && (
                        <Pressable
                          onPress={onPrevious}
                          style={{
                            position: 'absolute',
                            left: -50,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 20,
                            width: 40,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="chevron-left" size={24} color={textColor} />
                        </Pressable>
                      )}
                      <Text
                        fontSize={24}
                        fontWeight="900"
                        fontStyle="italic"
                        color={textColor}
                        flex={1}
                        textAlign="center"
                      >
                        {title}
                      </Text>
                      {/* Navigation Arrows - Right (when no image) */}
                      {totalCount > 1 && onNext && (
                        <Pressable
                          onPress={onNext}
                          style={{
                            position: 'absolute',
                            right: -50,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 20,
                            width: 40,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="chevron-right" size={24} color={textColor} />
                        </Pressable>
                      )}
                      <Pressable onPress={onClose} style={{ marginLeft: 'auto' }}>
                        <Feather name="x" size={24} color={textColor} />
                      </Pressable>
                    </XStack>
                  )}

                  {(imageUrl || youtubeVideoId) && (
                    <Text
                      fontSize={24}
                      fontWeight="900"
                      fontStyle="italic"
                      color={textColor}
                      textAlign="center"
                    >
                      {title}
                    </Text>
                  )}

                  {/* Body Text */}
                  <Text fontSize={16} color={textColor} textAlign="center" opacity={0.8}>
                    {body}
                  </Text>

                  {/* Page Indicator (when no image/video) */}
                  {!imageUrl && !youtubeVideoId && totalCount > 1 && (
                    <XStack justifyContent="center" marginTop="$2">
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>
                          {currentIndex + 1} / {totalCount}
                        </Text>
                      </View>
                    </XStack>
                  )}

                  {/* Action Buttons - Stacked vertically */}
                  {content.modal_actions && content.modal_actions.length > 0 && (
                    <YStack gap="$2" marginTop="$2" width="100%">
                      {content.modal_actions.map((action) => {
                        // For external URLs, get the label from the URL key or use default
                        let actionLabel = getActionLabel(action);
                        if (action.startsWith('external_url:')) {
                          const urlKey = action.replace('external_url:', '');
                          const url = content.modal_action_urls?.[urlKey] || content.modal_action_urls?.[action];
                          if (url) {
                            // Try to extract a friendly name from the URL or use default
                            try {
                              const urlObj = new URL(url);
                              actionLabel = urlObj.hostname.replace('www.', '') || 'Open Link';
                            } catch {
                              actionLabel = 'Open Link';
                            }
                          }
                        }
                        
                        return (
                          <Button
                            key={action}
                            size="sm"
                            variant="primary"
                            onPress={() => handleActionPress(action)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              width: '100%',
                            }}
                          >
                            <Feather name={getActionIcon(action) as keyof typeof Feather.glyphMap} size={16} color="white" />
                            <Text color="white" fontWeight="600">
                              {actionLabel}
                            </Text>
                          </Button>
                        );
                      })}
                    </YStack>
                  )}

                  {/* Dismiss/Next Button */}
                  {totalCount > 1 && currentIndex < totalCount - 1 ? (
                    <Button size="sm" variant="primary" onPress={onNext} marginTop="$2">
                      <Text color="white" fontWeight="600">
                        Next ({currentIndex + 1}/{totalCount})
                      </Text>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onPress={onClose} marginTop="$2">
                      <Text color={textColor}>Dismiss</Text>
                    </Button>
                  )}
                </YStack>
              </YStack>
            </Animated.View>
          </YStack>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

