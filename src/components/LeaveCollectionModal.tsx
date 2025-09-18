import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { height } = Dimensions.get('window');

interface LeaveCollectionModalProps {
  visible: boolean;
  collectionName: string;
  routeCount: number;
  memberRole: string;
  onConfirm: (customMessage?: string) => void;
  onCancel: () => void;
}

export function LeaveCollectionModal({
  visible,
  collectionName,
  routeCount,
  memberRole,
  onConfirm,
  onCancel,
}: LeaveCollectionModalProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [customMessage, setCustomMessage] = useState('');

  // Snap points for resizing
  const snapPoints = {
    large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
    medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
    small: height * 0.7,   // Top at 70% of screen (show 30% - small)
    dismissed: height,     // Completely off-screen
  };
  
  const currentState = useSharedValue(snapPoints.large);
  const translateY = useSharedValue(snapPoints.large);
  const isDragging = React.useRef(false);

  // Pan gesture for drag-to-dismiss
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        
        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.small + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
        
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;
      
      const currentPosition = currentState.value + translationY;
      
      // Dismiss if dragged down past the small snap point with reasonable velocity
      if (currentPosition > snapPoints.small + 30 && velocityY > 200) {
        runOnJS(onCancel)();
        return;
      }
      
      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.small;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.large),
        snapPoints.small,
      );
      
      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      
      currentState.value = boundedTarget;
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Animation effects
  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;
    }
  }, [visible, snapPoints.large, currentState]);

  const handleConfirm = () => {
    onConfirm(customMessage.trim() || undefined);
    setCustomMessage(''); // Reset for next time
  };

  const handleCancel = () => {
    onCancel();
    setCustomMessage(''); // Reset for next time
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleCancel} />
        <GestureDetector gesture={panGesture}>
          <ReanimatedAnimated.View 
            style={[
              styles.modal,
              {
                backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
              },
              animatedGestureStyle
            ]}
          >
            <YStack padding="$4" gap="$4" flex={1}>
              {/* Drag Handle */}
              <View style={styles.dragHandle}>
                <View style={[
                  styles.handle,
                  { backgroundColor: colorScheme === 'dark' ? '#666' : '#CCC' }
                ]} />
              </View>

              {/* Header */}
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$6" fontWeight="bold" color="$color" flex={1} textAlign="center">
                  {t('routeCollections.leaveCollection') || 'Leave Collection?'}
                </Text>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={[
                    styles.closeButton,
                    { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                </TouchableOpacity>
              </XStack>

              {/* Collection Info */}
              <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$3">
                <XStack alignItems="center" gap="$2">
                  <Feather name="folder" size={20} color="#00E6C3" />
                  <Text fontSize="$5" fontWeight="600" color="$color">
                    {collectionName}
                  </Text>
                </XStack>
                
                <XStack gap="$4" alignItems="center">
                  <Text fontSize="$3" color="$gray11">
                    {t('routeCollections.routeCount') || 'Routes'}: {routeCount}
                  </Text>
                  <Text fontSize="$3" color="$gray11">
                    {t('routeCollections.yourRole') || 'Your Role'}: {memberRole}
                  </Text>
                </XStack>
              </YStack>

              {/* Warning Message */}
              <YStack gap="$2" padding="$3" backgroundColor="rgba(239, 68, 68, 0.1)" borderRadius="$3" borderWidth={1} borderColor="rgba(239, 68, 68, 0.3)">
                <XStack alignItems="center" gap="$2">
                  <Feather name="alert-triangle" size={16} color="#EF4444" />
                  <Text fontSize="$4" fontWeight="600" color="#EF4444">
                    {t('routeCollections.warning') || 'Warning'}
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$gray11">
                  {t('routeCollections.leaveWarning') || 'You will no longer have access to this collection and its routes. This action cannot be undone.'}
                </Text>
              </YStack>

              {/* Custom Message Input */}
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {t('routeCollections.optionalMessage') || 'Optional Message'}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  {t('routeCollections.leaveMessageDescription') || 'Leave a message for the collection owner (optional):'}
                </Text>
                <TextInput
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder={t('routeCollections.leaveMessagePlaceholder') || 'Why are you leaving? Any feedback for the owner?'}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                />
              </YStack>

              {/* Action Buttons */}
              <YStack gap="$3" marginTop="$2">
                <Button
                  backgroundColor="#EF4444"
                  color="white"
                  size="$5"
                  onPress={handleConfirm}
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="log-out" size={16} color="white" />
                    <Text color="white" fontWeight="600">
                      {t('routeCollections.leaveCollection') || 'Leave Collection'}
                    </Text>
                  </XStack>
                </Button>
                
                <Button
                  variant="secondary"
                  size="$4"
                  onPress={handleCancel}
                >
                  <Text color="$color" fontWeight="500">
                    {t('common.cancel') || 'Cancel'}
                  </Text>
                </Button>
              </YStack>
            </YStack>
          </ReanimatedAnimated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
