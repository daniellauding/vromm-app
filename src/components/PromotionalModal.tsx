import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, Dimensions, Image } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView from 'react-native-webview';
import * as Linking from 'expo-linking';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PromotionalContent {
  id: string;
  title: string;
  body: string;
  image_url?: string;
  youtube_embed?: string;
  iframe_embed?: string;
  target?: string;
  icon?: string;
  order_index: number;
}

interface PromotionalModalProps {
  visible: boolean;
  onClose: () => void;
  contentType?: string;
}

export function PromotionalModal({
  visible,
  onClose,
  contentType = 'modal',
}: PromotionalModalProps) {
  const { language } = useTranslation();
  const [content, setContent] = useState<PromotionalContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load promotional content from Supabase
  useEffect(() => {
    if (visible) {
      loadPromotionalContent();
    }
  }, [visible, contentType]);

  const loadPromotionalContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', contentType)
        .eq('active', true)
        .order('order_index');

      if (error) throw error;

      if (data && data.length > 0) {
        const promotionalContent: PromotionalContent[] = data
          .filter((item) => {
            // Filter for mobile platforms
            if (!item.platforms) return false;
            const platforms =
              typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
            return (
              Array.isArray(platforms) &&
              (platforms.includes('mobile') || platforms.includes('both'))
            );
          })
          .map((item) => ({
            id: item.id,
            title: item.title?.[language] || item.title?.en || 'Promotion',
            body: item.body?.[language] || item.body?.en || '',
            image_url: item.image_url,
            youtube_embed: item.youtube_embed,
            iframe_embed: item.iframe_embed,
            target: item.target,
            icon: item.icon,
            order_index: item.order_index,
          }));

        setContent(promotionalContent);
      }
    } catch (error) {
      console.error('Error loading promotional content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = async () => {
    // Mark this promotional content as seen
    try {
      await AsyncStorage.setItem(`promotional_${contentType}_seen`, 'true');
    } catch (error) {
      console.error('Error saving promotional status:', error);
    }

    setCurrentIndex(0);
    onClose();
  };

  const handleAction = () => {
    const currentContent = content[currentIndex];
    if (currentContent?.target) {
      // Handle navigation or external links
      if (currentContent.target.startsWith('http')) {
        Linking.openURL(currentContent.target);
      } else {
        // Handle internal navigation (could be expanded)
        console.log('Navigate to:', currentContent.target);
      }
    }
    handleClose();
  };

  if (!visible || loading || content.length === 0) {
    return null;
  }

  const currentContent = content[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === content.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: SCREEN_WIDTH - 60,
            maxHeight: SCREEN_HEIGHT * 0.8,
          }}
        >
          <YStack
            backgroundColor="$background"
            borderRadius={24}
            padding="$5"
            gap="$4"
            borderWidth={1}
            borderColor="$borderColor"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.3}
            shadowRadius={16}
          >
            {/* Header - similar to OnboardingScreen */}
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$2" flex={1}>
                {currentContent.icon && <Text fontSize={24}>{currentContent.icon}</Text>}
                <Text fontSize="$7" fontWeight="bold" color="$color" flex={1}>
                  {currentContent.title}
                </Text>
              </XStack>
            </XStack>

            {/* Content */}
            <YStack gap="$3" flex={1}>
              {/* Image */}
              {currentContent.image_url && (
                <Image
                  source={{ uri: currentContent.image_url }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 12,
                    resizeMode: 'cover',
                  }}
                />
              )}

              {/* YouTube Embed */}
              {currentContent.youtube_embed && (
                <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
                  <WebView
                    source={{ uri: currentContent.youtube_embed }}
                    style={{ flex: 1 }}
                    allowsFullscreenVideo
                  />
                </View>
              )}

              {/* iFrame Embed */}
              {currentContent.iframe_embed && (
                <View style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}>
                  <WebView source={{ html: currentContent.iframe_embed }} style={{ flex: 1 }} />
                </View>
              )}

              {/* Body Text */}
              <Text fontSize="$4" color="#ccc" lineHeight="$1">
                {currentContent.body}
              </Text>
            </YStack>

            {/* Navigation */}
            <XStack justifyContent="space-between" alignItems="center">
              <Button
                variant="secondary"
                size="sm"
                onPress={handlePrevious}
                disabled={isFirst}
                opacity={isFirst ? 0.5 : 1}
                backgroundColor="#333"
              >
                <XStack alignItems="center" gap="$1">
                  <Feather name="chevron-left" size={16} color="white" />
                  <Text color="white">Previous</Text>
                </XStack>
              </Button>

              {/* Progress indicator */}
              <XStack gap="$1" alignItems="center">
                {content.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: index === currentIndex ? 16 : 8,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: index === currentIndex ? '#00E6C3' : '#444',
                    }}
                  />
                ))}
              </XStack>

              <Button
                variant="primary"
                size="sm"
                onPress={currentContent.target ? handleAction : isLast ? handleClose : handleNext}
                backgroundColor="#00E6C3"
              >
                <XStack alignItems="center" gap="$1">
                  <Text color="#000">
                    {currentContent.target ? 'Learn More' : isLast ? 'Close' : 'Next'}
                  </Text>
                  {!isLast && !currentContent.target && (
                    <Feather name="chevron-right" size={16} color="#000" />
                  )}
                </XStack>
              </Button>
            </XStack>
          </YStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Hook to check and show promotional modals
export function usePromotionalModal() {
  const [showModal, setShowModal] = useState(false);
  const [modalContentType, setModalContentType] = useState('modal');

  const checkForPromotionalContent = async (contentType = 'modal') => {
    try {
      console.log('🎉 [PromotionalModal] Checking for promotional content:', contentType);

      // Check if this promotional content has been seen
      const seen = await AsyncStorage.getItem(`promotional_${contentType}_seen`);
      console.log('🎉 [PromotionalModal] AsyncStorage check:', {
        key: `promotional_${contentType}_seen`,
        seen,
      });

      if (seen === 'true') {
        console.log('🎉 [PromotionalModal] Already seen - not showing');
        return false; // Already seen
      }

      // Check if there's active promotional content
      console.log('🎉 [PromotionalModal] Querying database for content...');
      const { data, error } = await supabase
        .from('content')
        .select('id, platforms')
        .eq('content_type', contentType)
        .eq('active', true);

      console.log('🎉 [PromotionalModal] Database query result:', {
        error: error?.message,
        dataLength: data?.length,
        data: data?.map((d) => ({ id: d.id, platforms: d.platforms })),
      });

      if (error) {
        console.error('🎉 [PromotionalModal] Database error:', error);
        return false;
      }

      if (!data || data.length === 0) {
        console.log('🎉 [PromotionalModal] No promotional content found');
        return false;
      }

      // Filter for mobile platforms
      const mobileContent = data.filter((item) => {
        if (!item.platforms) return false;
        const platforms =
          typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
        return (
          Array.isArray(platforms) && (platforms.includes('mobile') || platforms.includes('both'))
        );
      });

      console.log('🎉 [PromotionalModal] Mobile content filtered:', {
        total: data.length,
        mobile: mobileContent.length,
      });

      if (mobileContent.length === 0) {
        console.log('🎉 [PromotionalModal] No mobile promotional content found');
        return false;
      }

      console.log('🎉 [PromotionalModal] SHOWING promotional modal');
      setModalContentType(contentType);
      setShowModal(true);
      return true;
    } catch (error) {
      console.error('🎉 [PromotionalModal] Error checking promotional content:', error);
      return false;
    }
  };

  return {
    showModal,
    modalContentType,
    setShowModal,
    checkForPromotionalContent,
  };
}
