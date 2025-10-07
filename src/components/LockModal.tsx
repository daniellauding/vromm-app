import React, { useState, useEffect } from 'react';
import { Modal, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Lock, X } from '@tamagui/lucide-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface LockModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: string;
  featureName: string;
}

export function LockModal({ visible, onClose, contentType, featureName }: LockModalProps) {
  const { language, t } = useTranslation();
  const colorScheme = useColorScheme();
  const [content, setContent] = useState<PromotionalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [backdropOpacity] = useState(new Animated.Value(0));
  const [modalScale] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      loadLockContent();
      showModal();
    } else {
      hideModal();
    }
  }, [visible, contentType]);

  const loadLockContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', contentType)
        .eq('active', true)
        .order('order_index')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const item = data[0];

        // Filter for mobile platforms
        if (item.platforms) {
          const platforms =
            typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
          if (
            Array.isArray(platforms) &&
            (platforms.includes('mobile') || platforms.includes('both'))
          ) {
            const lockContent: PromotionalContent = {
              id: item.id,
              title:
                item.title?.[language] ||
                item.title?.en ||
                t('lockModal.defaultTitle') ||
                'Feature Locked',
              body:
                item.body?.[language] ||
                item.body?.en ||
                t('lockModal.defaultBody') ||
                'This feature is currently locked. Upgrade to access it!',
              image_url: item.image_url,
              youtube_embed: item.youtube_embed,
              iframe_embed: item.iframe_embed,
              target: item.target,
              icon: item.icon,
              order_index: item.order_index,
            };
            setContent(lockContent);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lock content:', error);
    } finally {
      setLoading(false);
    }
  };

  const showModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    hideModal();
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleUpgrade = () => {
    if (content?.target) {
      // Handle upgrade action - could open external link or navigate to upgrade screen
      console.log('Upgrade clicked for:', content.target);
    }
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '90%', maxWidth: 400 }}
          >
            <Animated.View
              style={{
                transform: [{ scale: modalScale }],
              }}
            >
              <YStack
                backgroundColor="$background"
                borderRadius="$4"
                padding="$4"
                maxHeight="85%"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.3}
                shadowRadius={8}
                elevation={8}
              >
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
                  <XStack alignItems="center" gap="$2">
                    <Lock size={24} color="$red9" />
                    <Text fontSize="$6" fontWeight="bold" color="$color">
                      {t('lockModal.title') || 'Feature Locked'}
                    </Text>
                  </XStack>
                  <TouchableOpacity onPress={handleClose}>
                    <X size={24} color="$gray11" />
                  </TouchableOpacity>
                </XStack>

                {/* Content */}
                {loading ? (
                  <YStack alignItems="center" justifyContent="center" padding="$8">
                    <Text color="$gray11">Loading...</Text>
                  </YStack>
                ) : content ? (
                  <YStack gap="$4">
                    {/* Feature Name */}
                    <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
                      {featureName}
                    </Text>

                    {/* Promotional Content */}
                    <YStack gap="$3">
                      <Text fontSize="$4" fontWeight="600" color="$color" textAlign="center">
                        {content.title}
                      </Text>

                      <Text fontSize="$3" color="$gray11" lineHeight="$1" textAlign="center">
                        {content.body}
                      </Text>

                      {/* Image if available */}
                      {content.image_url && (
                        <YStack
                          height={150}
                          backgroundColor="$gray3"
                          borderRadius="$3"
                          overflow="hidden"
                          marginTop="$2"
                        >
                          <Image
                            source={{ uri: content.image_url }}
                            style={{
                              width: '100%',
                              height: '100%',
                              resizeMode: 'cover',
                            }}
                          />
                        </YStack>
                      )}
                    </YStack>

                    {/* Action Buttons */}
                    <XStack gap="$3" marginTop="$4">
                      <Button flex={1} variant="outlined" onPress={handleClose}>
                        <Text color="$color">{t('lockModal.cancel') || 'Cancel'}</Text>
                      </Button>

                      <Button flex={1} backgroundColor="$blue9" onPress={handleUpgrade}>
                        <Text color="white">{t('lockModal.upgrade') || 'Upgrade Now'}</Text>
                      </Button>
                    </XStack>
                  </YStack>
                ) : (
                  <YStack alignItems="center" justifyContent="center" padding="$8" gap="$4">
                    <Text color="$gray11" textAlign="center">
                      {t('lockModal.noContent') || 'No promotional content available'}
                    </Text>
                    <Button variant="outlined" onPress={handleClose}>
                      <Text color="$color">{t('lockModal.close') || 'Close'}</Text>
                    </Button>
                  </YStack>
                )}
              </YStack>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// Hook to manage lock modal state
export function useLockModal() {
  const [showModal, setShowModal] = useState(false);
  const [modalContentType, setModalContentType] = useState('lock');
  const [featureName, setFeatureName] = useState('');

  const showLockModal = (contentType: string, feature: string) => {
    setModalContentType(contentType);
    setFeatureName(feature);
    setShowModal(true);
  };

  const hideLockModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    modalContentType,
    featureName,
    showLockModal,
    hideLockModal,
  };
}
