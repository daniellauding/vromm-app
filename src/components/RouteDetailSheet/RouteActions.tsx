import React from 'react';
import { XStack, YStack } from 'tamagui';
import { IconButton } from '../IconButton';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import DrivenOptionsModal from './DrivenOptionsModal';
import { AppAnalytics } from '../../utils/analytics';
import { CreateRouteSheet } from '../CreateRouteSheet';
import RouteOptions from './RouteOptions';

async function playActionSound() {
  try {
    // Haptic feedback (works even if muted)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Set audio mode for iOS
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // Respect silent mode
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(require('../../../assets/sounds/ui-done.mp3'), {
      shouldPlay: true,
      volume: 0.5,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('🔊 Action sound error (may be muted):', error);
  }
}

export default function RouteActions({
  routeId,
  routeData,
  onClose,
  handleRefresh,
  onOpenReviewSheet,
}: {
  routeId: string | null;
  routeData: any;
  onClose: () => void;
  handleRefresh: () => void;
  onOpenReviewSheet?: () => void;
}) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = React.useState(false);
  const [isDriven, setIsDriven] = React.useState(false);
  const [isShowDrivenOptionsSheet, setShowDrivenOptionsSheet] = React.useState(false);
  const [showCreateRouteSheet, setShowCreateRouteSheet] = React.useState(false);
  const [isShowOptionsSheet, setShowOptionsSheet] = React.useState(false);

  let navigation: any = null;
  try {
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.warn('Navigation not available in modal context:', error);
    navigation = null;
  }

  const checkSavedStatus = React.useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_routes')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      setIsSaved(!!data);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  }, [user, routeId]);

  const checkDrivenStatus = React.useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('driven_routes')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      setIsDriven(!!data);
    } catch (err) {
      console.error('Error checking driven status:', err);
    }
  }, [user, routeId]);

  React.useEffect(() => {
    checkSavedStatus();
    checkDrivenStatus();
  }, [checkSavedStatus, checkDrivenStatus]);

  const handleSaveRoute = React.useCallback(async () => {
    if (!user) {
      showToast({
        title: t('routeDetail.signInRequired') || 'Sign in required',
        message: t('routeDetail.pleaseSignInToSave') || 'Please sign in to save routes',
        type: 'error',
      });
      return;
    }

    try {
      if (isSaved) {
        await supabase.from('saved_routes').delete().eq('route_id', routeId).eq('user_id', user.id);
        showToast({
          title: t('routeDetail.removedFromSaved') || 'Removed from Saved',
          message:
            t('routeDetail.routeRemovedFromSaved') ||
            'Route has been removed from your saved routes',
          type: 'info',
        });
      } else {
        // Play sound and haptic
        playActionSound();

        await supabase.from('saved_routes').insert({
          route_id: routeId,
          user_id: user.id,
          saved_at: new Date().toISOString(),
        });
        showToast({
          title: t('routeDetail.saved') || '✅ Saved!',
          message: t('routeDetail.routeSaved') || 'Route has been saved to your collection',
          type: 'success',
        });
      }
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Error toggling save status:', err);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToUpdateSave') || 'Failed to update save status',
        type: 'error',
      });
    }
  }, [user, isSaved, routeId, showToast, t]);

  const handleMarkDriven = React.useCallback(async () => {
    if (!user?.id) {
      showToast({
        title: t('common.error') || 'Error',
        message:
          t('routeDetail.pleaseSignInToMark') || 'Please sign in to mark this route as driven',
        type: 'error',
      });
      return;
    }

    if (isDriven) {
      // If already driven, show options sheet instead of alert
      setShowDrivenOptionsSheet(true);
    } else {
      // Play sound and haptic
      playActionSound();

      // First time marking as driven - open review sheet if callback provided, otherwise navigate
      if (onOpenReviewSheet) {
        onOpenReviewSheet();
      } else if (navigation) {
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
              t('routeDetail.navigationNotAvailable') || 'Navigation not available in this context',
            type: 'error',
          });
        }
      } else {
        showToast({
          title: t('common.error') || 'Error',
          message:
            t('routeDetail.navigationNotAvailable') || 'Navigation not available in this context',
          type: 'error',
        });
      }
    }
  }, [user, isDriven, routeId, showToast, t, navigation, onClose, onOpenReviewSheet]);

  return (
    <YStack gap="$3">
      <XStack gap="$2" justifyContent="space-between">
        <IconButton
          icon="bookmark"
          label={isSaved ? t('routeDetail.saved') || 'Saved' : t('routeDetail.saveRoute') || 'Save'}
          onPress={handleSaveRoute}
          selected={isSaved}
          backgroundColor="transparent"
          borderColor="transparent"
          flex={1}
        />
        <IconButton
          icon="check-circle"
          label={
            isDriven
              ? t('routeDetail.markedAsDriven') || 'Marked as Driven'
              : t('routeDetail.markAsDriven') || 'Mark as Driven'
          }
          onPress={handleMarkDriven}
          selected={isDriven}
          backgroundColor="transparent"
          borderColor="transparent"
          flex={1}
        />
        {routeData?.exercises &&
          Array.isArray(routeData.exercises) &&
          routeData.exercises.length > 0 && (
            <IconButton
              icon="play"
              label={t('routeDetail.startExercises') || 'Start'}
              onPress={() => {
                if (routeData?.exercises) {
                  if (navigation) {
                    try {
                      navigation.navigate('RouteExercise', {
                        routeId: routeId!,
                        exercises: routeData.exercises,
                        routeName: routeData.name,
                        startIndex: 0,
                      });
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
                }
              }}
              backgroundColor={isSaved ? 'transparent' : 'transparent'}
              borderColor={isSaved ? 'transparent' : 'transparent'}
              flex={1}
            />
          )}
        {user?.id === routeData?.creator_id && (
          <IconButton
            icon="edit-2"
            label={t('routeDetail.addEdit') || 'Edit'}
            onPress={() => {
              AppAnalytics.trackButtonPress('edit_route', 'RouteDetailSheet', {
                route_id: routeData?.id,
              }).catch(() => {});
              // Show CreateRouteSheet as modal
              setShowCreateRouteSheet(true);
            }}
            backgroundColor={isSaved ? 'transparent' : 'transparent'}
            borderColor={isSaved ? 'transparent' : 'transparent'}
            flex={1}
          />
        )}
        <IconButton
          icon="more-vertical"
          label="Options"
          onPress={() => setShowOptionsSheet(true)}
          backgroundColor={isSaved ? 'transparent' : 'transparent'}
          borderColor={isSaved ? 'transparent' : 'transparent'}
          flex={1}
        />
      </XStack>
      <DrivenOptionsModal
        routeId={routeId}
        visible={isShowDrivenOptionsSheet}
        onClose={() => setShowDrivenOptionsSheet(false)}
        onChange={({ isDriven }) => setIsDriven(isDriven)}
      />
      {showCreateRouteSheet && routeData && (
        <CreateRouteSheet
          visible={showCreateRouteSheet}
          onClose={() => {
            setShowCreateRouteSheet(false);
            // Refresh route data after editing
            handleRefresh();
          }}
          routeId={routeData.id}
          onRouteUpdated={(updatedRouteId) => {
            console.log('Route updated:', updatedRouteId);
            setShowCreateRouteSheet(false);
            // Refresh route data
            handleRefresh();
          }}
          isModal={true}
        />
      )}
      {isShowOptionsSheet && (
        <RouteOptions
          routeData={routeData}
          onClose={() => setShowOptionsSheet(false)}
          visible={isShowOptionsSheet}
          onRouteDeleted={() => {
            console.log('🗑️ [RouteActions] Route deleted, closing detail sheet');
            setShowOptionsSheet(false);
            // Close the entire RouteDetailSheet
            onClose();
          }}
        />
      )}
    </YStack>
  );
}
