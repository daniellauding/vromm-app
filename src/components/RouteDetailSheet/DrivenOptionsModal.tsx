import React from 'react';
import { Modal, Animated, Pressable, View, TouchableOpacity } from 'react-native';

import { YStack, XStack, Text } from 'tamagui';
import { Button } from '../../components/Button';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@/src/contexts/ToastContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useThemePreference } from '@/src/hooks/useThemeOverride';
import { NavigationProp } from '../../types/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// Helper function to get translation with fallback
const getTranslation = (t: (key: string) => string, key: string, fallback: string): string => {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
};

export default function DrivenOptionsModal({
  routeId,
  visible,
  onClose,
  onChange,
  onOpenReviewSheet,
}: {
  routeId: string | null;
  visible: boolean;
  onClose: () => void;
  onChange: ({ isDriven }: { isDriven: boolean }) => void;
  onOpenReviewSheet?: () => void;
}) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const cardBg = colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';

  let navigation: any = null;
  try {
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.warn('Navigation not available in modal context:', error);
    navigation = null;
  }

  const handleUnmarkDriven = React.useCallback(async () => {
    if (!user?.id || !routeId) {
      showToast({
        title: getTranslation(t, 'common.error', 'Error'),
        message: getTranslation(t, 'routeDetail.pleaseSignInToUnmark', 'Please sign in to unmark this route'),
        type: 'error',
      });
      return;
    }

    try {
      // Remove from driven routes
      const { error } = await supabase
        .from('driven_routes')
        .delete()
        .eq('route_id', routeId)
        .eq('user_id', user.id);

      if (error) throw error;

      onChange({ isDriven: false });
      showToast({
        title: getTranslation(t, 'routeDetail.unmarkedAsDriven', 'Unmarked as Driven'),
        message: getTranslation(t, 'routeDetail.routeUnmarkedAsDriven', 'Route has been unmarked as driven'),
        type: 'success',
      });
    } catch (error) {
      console.error('Error unmarking route as driven:', error);
      showToast({
        title: getTranslation(t, 'common.error', 'Error'),
        message: getTranslation(t, 'routeDetail.failedToUnmark', 'Failed to unmark route as driven'),
        type: 'error',
      });
    }
  }, [onChange, routeId, showToast, t, user]);

  const handleEditReview = () => {
    onClose();
    // Prefer the sheet callback if provided (for better UX within sheets)
    if (onOpenReviewSheet) {
      setTimeout(() => onOpenReviewSheet(), 100);
    } else if (navigation) {
      try {
        navigation.navigate('AddReview', {
          routeId: routeId!,
          returnToRouteDetail: true,
        } as any);
      } catch {
        showToast({
          title: getTranslation(t, 'common.error', 'Error'),
          message: getTranslation(t, 'routeDetail.navigationNotAvailable', 'Navigation not available in this context'),
          type: 'error',
        });
      }
    } else {
      showToast({
        title: getTranslation(t, 'common.error', 'Error'),
        message: getTranslation(t, 'routeDetail.navigationNotAvailable', 'Navigation not available in this context'),
        type: 'error',
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View
          style={{
            backgroundColor: backgroundColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}
        >
          {/* Drag Handle */}
          <View
            style={{
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colorScheme === 'dark' ? '#555' : '#DDD',
              }}
            />
          </View>

          <YStack gap="$4">
            <Text
              fontSize={22}
              fontWeight="900"
              fontStyle="italic"
              color={textColor}
              textAlign="center"
            >
              {getTranslation(t, 'routeDetail.drivenOptions', 'Route Options')}
            </Text>

            <YStack gap="$3">
              {/* Edit Review Option */}
              <TouchableOpacity
                onPress={handleEditReview}
                style={{
                  padding: 16,
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderColor,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colorScheme === 'dark' ? '#333' : '#E8E8E8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="rate-review" size={20} color={textColor} />
                </View>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" color={textColor}>
                    {getTranslation(t, 'routeDetail.editReview', 'Edit Review')}
                  </Text>
                  <Text fontSize={13} color={colorScheme === 'dark' ? '#888' : '#666'}>
                    {getTranslation(t, 'review.contentStep', 'Tell us about your experience')}
                  </Text>
                </YStack>
                <Feather name="chevron-right" size={20} color={colorScheme === 'dark' ? '#666' : '#999'} />
              </TouchableOpacity>

              {/* Unmark as Driven Option */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  handleUnmarkDriven();
                }}
                style={{
                  padding: 16,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="x-circle" size={20} color="#EF4444" />
                </View>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" color="#EF4444">
                    {getTranslation(t, 'routeDetail.unmarkAsDriven', 'Unmark as Driven')}
                  </Text>
                  <Text fontSize={13} color="#EF4444" style={{ opacity: 0.7 }}>
                    {getTranslation(t, 'routeDetail.routeUnmarkedAsDriven', 'Remove from driven routes')}
                  </Text>
                </YStack>
              </TouchableOpacity>
            </YStack>

            {/* Cancel Button */}
            <Button variant="secondary" size="lg" onPress={onClose}>
              {getTranslation(t, 'common.cancel', 'Cancel')}
            </Button>
          </YStack>
        </Animated.View>
      </View>
    </Modal>
  );
}
