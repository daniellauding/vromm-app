import React from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

async function playActionSound() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    console.log('Action sound error:', error);
  }
}

export function useRouteActions({
  routeId,
  onOpenReviewSheet,
  onClose,
  navigation,
}: {
  routeId: string | null;
  onOpenReviewSheet?: () => void;
  onClose: () => void;
  navigation: any;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = React.useState(false);
  const [isDriven, setIsDriven] = React.useState(false);

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
    } catch {}
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
    } catch {}
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
          message: t('routeDetail.routeRemovedFromSaved') || 'Route has been removed from your saved routes',
          type: 'info',
        });
      } else {
        playActionSound();
        await supabase.from('saved_routes').insert({
          route_id: routeId,
          user_id: user.id,
          saved_at: new Date().toISOString(),
        });
        showToast({
          title: t('routeDetail.saved') || 'Saved!',
          message: t('routeDetail.routeSaved') || 'Route has been saved to your collection',
          type: 'success',
        });
      }
      setIsSaved(!isSaved);
    } catch {
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
        message: t('routeDetail.pleaseSignInToMark') || 'Please sign in to mark this route as driven',
        type: 'error',
      });
      return;
    }
    if (isDriven) {
      // Already driven - return info so caller can show options
      return 'already_driven';
    } else {
      playActionSound();
      if (onOpenReviewSheet) {
        onOpenReviewSheet();
      } else if (navigation) {
        try {
          navigation.navigate('AddReview', {
            routeId: routeId!,
            returnToRouteDetail: true,
          });
          onClose();
        } catch {
          showToast({
            title: t('common.error') || 'Error',
            message: t('routeDetail.navigationNotAvailable') || 'Navigation not available in this context',
            type: 'error',
          });
        }
      }
    }
    return null;
  }, [user, isDriven, routeId, showToast, t, navigation, onClose, onOpenReviewSheet]);

  return {
    isSaved,
    isDriven,
    setIsDriven,
    handleSaveRoute,
    handleMarkDriven,
  };
}
