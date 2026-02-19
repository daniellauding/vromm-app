import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, AppState, Dimensions, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Text, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useRecording } from '../../contexts/RecordingContext';
import { hideRecordingBanner, showActiveBanner, showPausedBanner } from '../../utils/notifications';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { DARK_THEME, styles } from './styles';
import MapPreview from './MapPreview';
import RecordingStats from './RecordingStats';
import { RecordedRouteData as RecordedRouteDataType } from './types';

const { height: screenHeight } = Dimensions.get('window');

// Update the RecordedRouteData interface to be exported

export type RecordedRouteData = RecordedRouteDataType;
interface RecordDrivingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute?: (routeData: RecordedRouteData) => void;
}

// Performance-optimized component
export const RecordDrivingSheet = React.memo((props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t, language } = useTranslation();
  const { hideModal, setModalPointerEvents } = useModal();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };
  const {
    recordingState,
    pauseRecording,
    resumeRecording,
    stopRecording,
    minimizeRecording,
    cancelRecording,
  } = useRecording();

  // Local state for UI only
  const [showMap, setShowMap] = useState(false);

  // Drag functionality for minimizing when recording is active
  const translateY = useSharedValue(0);
  const isDragging = useRef(false);

  // Snap points for drag-to-minimize
  const snapPoints = useMemo(() => {
    return {
      expanded: 0, // Fully visible
      minimized: screenHeight * 0.7, // Minimized (show only top 30%)
      dismissed: screenHeight, // Completely hidden
    };
  }, []);

  // Pan gesture for drag-to-minimize (when recording) or drag-to-close (when not recording)
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      console.log('🎯 RecordDrivingSheet: Pan gesture began');
      isDragging.current = true;
    })
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = Math.max(0, translationY);
      translateY.value = newPosition;
      console.log('🎯 RecordDrivingSheet: Pan gesture update', { translationY, newPosition });
    })
    .onEnd((event) => {
      isDragging.current = false;
      const { translationY, velocityY } = event;
      console.log('🎯 RecordDrivingSheet: Pan gesture ended', {
        translationY,
        velocityY,
        isRecording: recordingState?.isRecording,
      });

      if (recordingState?.isRecording) {
        // When recording: drag down to minimize
        if (translationY > screenHeight * 0.3 || velocityY > 500) {
          // Drag down to minimize
          console.log('🎯 RecordDrivingSheet: Dragging to minimize');
          translateY.value = withSpring(snapPoints.minimized, { damping: 15, stiffness: 150 });
          runOnJS(minimizeRecording)();
        } else {
          // Snap back to expanded
          console.log('🎯 RecordDrivingSheet: Snapping back to expanded');
          translateY.value = withSpring(snapPoints.expanded, { damping: 15, stiffness: 150 });
        }
      } else {
        // When not recording: drag down to close
        if (translationY > screenHeight * 0.2 || velocityY > 300) {
          // Drag down to close
          console.log('🎯 RecordDrivingSheet: Dragging to close');
          translateY.value = withSpring(snapPoints.dismissed, { damping: 15, stiffness: 150 });
          runOnJS(onClose)();
        } else {
          // Snap back to expanded
          console.log('🎯 RecordDrivingSheet: Snapping back to expanded');
          translateY.value = withSpring(snapPoints.expanded, { damping: 15, stiffness: 150 });
        }
      }
    })
    .shouldCancelWhenOutside(false);

  // Animated style for the sheet
  const animatedSheetStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { top: translateY.value };
    }
    return { transform: [{ translateY: translateY.value }] };
  });

  // Cancel recording now uses global context
  const handleCancelRecording = useCallback(() => {
    try {
      // Cancel recording using global context
      cancelRecording();

      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error cancelling recording:', error);
      // Force close anyway
      onClose();
    }
  }, [cancelRecording, onClose]);

  // Minimize/Maximize handlers now use global context
  const handleMinimize = useCallback(() => {
    console.log('🎯 RecordDrivingSheet: Minimizing recording');
    minimizeRecording();
    // Allow touches to pass through when minimized
    setModalPointerEvents('box-none');
  }, [minimizeRecording, setModalPointerEvents]);

  // Handle modal pointer events when minimized/maximized state changes
  useEffect(() => {
    if (recordingState?.isMinimized) {
      // Allow touches to pass through when minimized
      setModalPointerEvents('box-none');
    } else {
      // Block touches when maximized (normal modal behavior)
      setModalPointerEvents('auto');
    }
  }, [recordingState?.isMinimized, setModalPointerEvents]);

  useEffect(() => {
    if (!recordingState?.isRecording) return;
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        showActiveBanner();
      } else {
        hideRecordingBanner();
      }
    };

    const subscriptionStopRecording = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (response.actionIdentifier === 'vromm_stop') {
          // 🚀 stop your recording logic here
          hideRecordingBanner();
          stopRecording();
        } else if (response.actionIdentifier === 'vromm_resume') {
          // 🚀 resume your recording logic here
          showActiveBanner();
          resumeRecording();
        } else if (response.actionIdentifier === 'vromm_pause') {
          // 🚀 pause your recording logic here
          showPausedBanner();
          pauseRecording();
        }
      },
    );

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      subscriptionStopRecording?.remove();
    };
  }, [recordingState?.isRecording, stopRecording, pauseRecording, resumeRecording]);

  // Auto-save and app state handling is now done by the global recording context

  // Safety check - don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Safety check - don't render if recordingState is not available
  if (!recordingState) {
    return null;
  }

  if (recordingState.isMinimized) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Backdrop - always show when sheet is visible */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {
          if (recordingState?.isRecording) {
            handleMinimize();
          } else {
            onClose();
          }
        }}
      />
      <ReanimatedAnimated.View
          style={[
            styles.sheet,
            { backgroundColor: DARK_THEME.background },
            animatedSheetStyle,
            recordingState.isMinimized && styles.minimizedSheet,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
            <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
              {getTranslation(
                'map.recordDriving',
                language === 'sv' ? 'Spela in körning' : 'Record Route',
              )}
            </Text>
            <XStack gap={8} alignItems="center">
              {/* Always show minimize button when recording - Debug added */}
              {recordingState.isRecording && (
                <TouchableOpacity
                  onPress={() => {
                    handleMinimize();
                  }}
                  style={{
                    padding: 4, // Add padding for easier tapping
                    backgroundColor: 'rgba(255,255,255,0.1)', // Add background for visibility
                    borderRadius: 4,
                  }}
                >
                  <Feather name="minus" size={24} color={DARK_THEME.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleCancelRecording} disabled={false}>
                <Feather name="x" size={24} color={DARK_THEME.text} />
              </TouchableOpacity>
            </XStack>
            </View>
          </GestureDetector>

          {/* Map Toggle Button - Show during recording or if we have waypoints to preview */}
          {(recordingState?.isRecording ||
            (recordingState?.waypoints && recordingState.waypoints.length > 0)) && (
            <XStack justifyContent="center" marginBottom={8}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: showMap ? '#69e3c4' : 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: showMap ? '#69e3c4' : 'rgba(255,255,255,0.3)',
                }}
                onPress={() => setShowMap(!showMap)}
              >
                <Feather name={showMap ? 'eye-off' : 'map'} size={16} color="white" />
                <Text color="white" marginLeft={4} fontWeight="500">
                  {showMap
                    ? getTranslation(
                        'recording.hidePreview',
                        language === 'sv' ? 'Dölj förhandsgranskning' : 'Hide Preview',
                      )
                    : getTranslation(
                        'recording.showPreview',
                        language === 'sv' ? 'Visa ruttförhandsgranskning' : 'Show Route Preview',
                      )}
                </Text>
              </TouchableOpacity>
            </XStack>
          )}

          {/* Enhanced Map Preview with Live Updates */}
          {showMap && <MapPreview />}

          {/* Recording Status Display (always shown when recording) */}
          {recordingState.isRecording && !showMap && (
            <View
              style={[
                styles.recordingStatusContainer,
                { backgroundColor: DARK_THEME.cardBackground },
              ]}
            >
              <View style={styles.recordingStatusInner}>
                <View
                  style={[
                    styles.recordingDot,
                    recordingState.isPaused ? styles.pausedDot : styles.activeDot,
                  ]}
                />
                <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                  {recordingState.isPaused
                    ? getTranslation(
                        'recording.pausedStatus',
                        language === 'sv' ? 'INSPELNING PAUSAD' : 'RECORDING PAUSED',
                      )
                    : getTranslation(
                        'recording.activeStatus',
                        language === 'sv' ? 'INSPELNING AKTIV' : 'RECORDING ACTIVE',
                      )}
                </Text>
              </View>
              <Text color={DARK_THEME.text} marginTop={4}>
                {getTranslation(
                  'recording.recordingInfo',
                  language === 'sv'
                    ? `Spelar in ${recordingState.waypoints.length} vägpunkter • ${recordingState.distance.toFixed(2)} km`
                    : `Recording ${recordingState.waypoints.length} waypoints • ${recordingState.distance.toFixed(2)} km`,
                )}
              </Text>
              {recordingState.debugMessage && (
                <Text color="#FF9500" fontSize={12} marginTop={4}>
                  {recordingState.debugMessage}
                </Text>
              )}
            </View>
          )}

          <RecordingStats
            setShowMap={setShowMap}
            onCreateRoute={onCreateRoute}
            onClose={onClose}
            hideModal={hideModal}
          />
        </ReanimatedAnimated.View>
    </View>
  );
});
