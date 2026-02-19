import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions, Modal, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRecording } from '../contexts/RecordingContext';
import { useTranslation } from '../contexts/TranslationContext';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { YStack, XStack, Button } from 'tamagui';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const GlobalRecordingWidget = React.memo(() => {
  const { recordingState, resumeRecording, pauseRecording, stopRecording, maximizeRecording } =
    useRecording();
  const { t } = useTranslation();

  // Confirmation modal state
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);

  // Drag functionality for repositioning the widget
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  // Pan gesture for dragging the widget - like macOS Finder window
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      console.log('🎯 GlobalRecordingWidget: Drag started');
      isDragging.current = true;
      // Store the initial position
      startX.current = translateX.value;
      startY.current = translateY.value;
    })
    .onUpdate((event) => {
      const { translationX, translationY } = event;
      console.log('🎯 GlobalRecordingWidget: Dragging', { translationX, translationY });

      // Calculate new position
      const newX = startX.current + translationX;
      const newY = startY.current + translationY;

      // Widget dimensions
      const widgetWidth = 160;
      const widgetHeight = 120;

      // Screen bounds - keep widget fully visible
      const minX = 0;
      const maxX = screenWidth - widgetWidth;
      const minY = 60; // Status bar height
      const maxY = screenHeight - widgetHeight - 100; // Bottom safe area

      // Constrain to screen bounds
      translateX.value = Math.max(minX, Math.min(newX, maxX));
      translateY.value = Math.max(minY, Math.min(newY, maxY));
    })
    .onEnd((event) => {
      console.log('🎯 GlobalRecordingWidget: Drag ended');
      isDragging.current = false;

      // Widget dimensions
      const widgetWidth = 160;
      const widgetHeight = 120;

      // Final bounds check
      const minX = 0;
      const maxX = screenWidth - widgetWidth;
      const minY = 60;
      const maxY = screenHeight - widgetHeight - 100;

      const finalX = Math.max(minX, Math.min(translateX.value, maxX));
      const finalY = Math.max(minY, Math.min(translateY.value, maxY));

      console.log('🎯 GlobalRecordingWidget: Final position', { finalX, finalY });

      // Smooth animation to final position
      translateX.value = withSpring(finalX, {
        damping: 20,
        stiffness: 200,
        mass: 1,
      });
      translateY.value = withSpring(finalY, {
        damping: 20,
        stiffness: 200,
        mass: 1,
      });
    })
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .shouldCancelWhenOutside(false)
    .minDistance(1); // Very sensitive for smooth dragging

  // Animated style for the widget
  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { left: translateX.value, top: translateY.value };
    }
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    };
  });

  // Handle quit confirmation
  const handleQuitPress = () => {
    setShowQuitConfirmation(true);
  };

  const handleBackToRecording = () => {
    setShowQuitConfirmation(false);
    maximizeRecording();
  };

  const handleDismissAndStop = () => {
    setShowQuitConfirmation(false);
    console.log('🎯 GlobalRecordingWidget: Stopping recording and maximizing sheet');
    // Stop recording but keep the session active to show the sheet
    stopRecording();
    // Ensure the sheet is maximized and visible
    maximizeRecording();
    console.log('🎯 GlobalRecordingWidget: Recording stopped, sheet should be visible');
  };

  const handleCancelQuit = () => {
    setShowQuitConfirmation(false);
  };

  // Memoize the shouldShow calculation to prevent unnecessary re-renders
  const shouldShow = useMemo(() => {
    return recordingState.isMinimized && recordingState.isRecording;
  }, [recordingState.isMinimized, recordingState.isRecording]);

  // Only show when recording is active and minimized
  if (!shouldShow) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(2)}km`;
  };

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <ReanimatedAnimated.View style={[styles.floatingWidget, animatedStyle]}>
          <View style={styles.floatingWidgetContent}>
            {/* Header with drag area */}
            <View style={styles.floatingWidgetHeader}>
              <Pressable style={styles.floatingWidgetDragArea} onPress={maximizeRecording}>
                <View
                  style={[
                    styles.recordingDot,
                    recordingState.isPaused ? styles.pausedDot : styles.activeDot,
                  ]}
                />
                <Text style={styles.floatingWidgetTitle}>
                  {recordingState.isPaused ? 'PAUSED' : 'RECORDING'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.floatingWidgetClose}
                onPress={handleQuitPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={16} color="white" />
              </Pressable>
            </View>

            {/* Stats section - also draggable */}
            <Pressable style={styles.floatingWidgetStats} onPress={maximizeRecording}>
              <Text style={styles.floatingWidgetStat}>
                {formatTime(recordingState.totalElapsedTime)}
              </Text>
              <Text style={styles.floatingWidgetStat}>
                {formatDistance(recordingState.distance)}
              </Text>
              <Text style={styles.floatingWidgetStat}>
                {recordingState.currentSpeed.toFixed(1)} km/h
              </Text>
            </Pressable>

            {/* Controls section - not draggable */}
            <View style={styles.floatingWidgetControls}>
              {recordingState.isPaused ? (
                <Pressable
                  style={styles.floatingWidgetButton}
                  onPress={resumeRecording}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="play" size={16} color="white" />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.floatingWidgetButton}
                  onPress={pauseRecording}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="pause" size={16} color="white" />
                </Pressable>
              )}

              <Pressable
                style={[styles.floatingWidgetButton, { backgroundColor: 'red' }]}
                onPress={() => {
                  console.log('🎯 GlobalRecordingWidget: Direct stop button pressed');
                  stopRecording();
                  maximizeRecording();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="square" size={16} color="white" />
              </Pressable>
            </View>
          </View>
        </ReanimatedAnimated.View>
      </GestureDetector>

      {/* Quit Confirmation Modal */}
      <Modal
        visible={showQuitConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelQuit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <YStack space={16} padding={20}>
              <Text style={styles.modalTitle}>
                {t('recording.quitConfirmation') || 'Quit Recording?'}
              </Text>

              <Text style={styles.modalMessage}>
                {t('recording.quitMessage') ||
                  'Are you sure you want to quit recording? You can go back to the recording interface or stop recording completely.'}
              </Text>

              <XStack space={12} justifyContent="center">
                <Button
                  backgroundColor="#3D3D1A"
                  color="white"
                  onPress={handleBackToRecording}
                  flex={1}
                  size="$3"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="maximize-2" size={16} color="white" />
                    <Text color="white" fontWeight="600">
                      {t('recording.backToRecording') || 'Back to Recording'}
                    </Text>
                  </XStack>
                </Button>

                <Button
                  backgroundColor="#CC4400"
                  color="white"
                  onPress={handleDismissAndStop}
                  flex={1}
                  size="$3"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="square" size={16} color="white" />
                    <Text color="white" fontWeight="600">
                      {t('recording.stopRecording') || 'Stop Recording'}
                    </Text>
                  </XStack>
                </Button>
              </XStack>

              <Button
                backgroundColor="rgba(255,255,255,0.1)"
                color="white"
                onPress={handleCancelQuit}
                size="$3"
              >
                <Text color="white">{t('common.cancel') || 'Cancel'}</Text>
              </Button>
            </YStack>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  floatingWidget: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingWidgetContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    maxWidth: screenWidth * 0.4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  floatingWidgetDragArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: '#69e3c4',
  },
  pausedDot: {
    backgroundColor: '#FF9500',
  },
  floatingWidgetTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  floatingWidgetClose: {
    padding: 4,
  },
  floatingWidgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  floatingWidgetStat: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
    flex: 1,
  },
  floatingWidgetControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  floatingWidgetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    padding: 6,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalMessage: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
