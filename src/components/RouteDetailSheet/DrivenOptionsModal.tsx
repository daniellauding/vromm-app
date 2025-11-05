import React from 'react';
import { Modal, Animated, Pressable, View, TouchableOpacity } from 'react-native';

import { YStack, Text, useTheme } from 'tamagui';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@/src/contexts/ToastContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { NavigationProp } from '../../types/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

export default function DrivenOptionsModal({
  routeId,
  visible,
  onClose,
  onChange,
}: {
  routeId: string | null;
  visible: boolean;
  onClose: () => void;
  onChange: ({ isDriven }: { isDriven: boolean }) => void;
}) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const iconColor = theme.color?.val || '#000000';
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');
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
        title: t('common.error') || 'Error',
        message: t('routeDetail.pleaseSignInToUnmark') || 'Please sign in to unmark this route',
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
        title: t('routeDetail.unmarkedAsDriven') || 'Unmarked as Driven',
        message: t('routeDetail.routeUnmarkedAsDriven') || 'Route has been unmarked as driven',
        type: 'success',
      });
    } catch (error) {
      console.error('Error unmarking route as driven:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToUnmark') || 'Failed to unmark route as driven',
        type: 'error',
      });
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
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
            <YStack gap="$4">
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {t('routeDetail.drivenOptions') || 'Driven Options'}
              </Text>

              <YStack gap="$2">
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (navigation) {
                      try {
                        navigation.navigate('AddReview', {
                          routeId: routeId!,
                          returnToRouteDetail: true,
                        } as any);
                        onClose();
                      } catch (error) {
                        showToast({
                          title: t('common.error') || 'Error',
                          message:
                            t('routeDetail.navigationNotAvailable') ||
                            'Navigation not available in this context',
                          type: 'error',
                        });
                      }
                    } else {
                      showToast({
                        title: t('common.error') || 'Error',
                        message:
                          t('routeDetail.navigationNotAvailable') ||
                          'Navigation not available in this context',
                        type: 'error',
                      });
                    }
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Feather name="edit" size={20} color={iconColor} />
                  <Text fontSize="$4" color="$color">
                    {t('routeDetail.editReview') || 'Edit Review'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    handleUnmarkDriven();
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Feather name="x-circle" size={20} color="#EF4444" />
                  <Text fontSize="$4" color="#EF4444">
                    {t('routeDetail.unmarkAsDriven') || 'Unmark as Driven'}
                  </Text>
                </TouchableOpacity>
              </YStack>

              <Button variant="outlined" size="lg" onPress={onClose}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
