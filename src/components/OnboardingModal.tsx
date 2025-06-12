import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { YStack, Button } from 'tamagui';
import { Onboarding, OnboardingSlide, completeOnboardingWithVersion } from './Onboarding';
import {
  fetchOnboardingSlides,
  resetOnboardingForCurrentUser,
} from '../services/onboardingService';
import { useAuth } from '../context/AuthContext';
import { Text } from './Text';
import { FontAwesome } from '@expo/vector-icons';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  forceShow?: boolean; // Used for first-time users or for testing
}

export function OnboardingModal({ visible, onClose, forceShow = false }: OnboardingModalProps) {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadSlides = async () => {
      try {
        setLoading(true);
        const onboardingSlides = await fetchOnboardingSlides();
        setSlides(onboardingSlides);
      } catch (error) {
        console.error('Error loading onboarding slides:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      loadSlides();
    }
  }, [visible]);

  const handleComplete = () => {
    completeOnboardingWithVersion('vromm_onboarding');
    onClose();
  };

  // Handle reset onboarding for testing
  const handleResetOnboarding = async () => {
    try {
      await resetOnboardingForCurrentUser();
      // Close modal first
      onClose();
      // Show confirmation
      alert('Onboarding has been reset. Restart the app to see onboarding again.');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding. Check console for details.');
    }
  };

  // Toggle debug options with 5 rapid taps
  const handleDebugTap = () => {
    setShowDebugOptions(!showDebugOptions);
  };

  if (!visible) return null;

  if (loading) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <YStack alignItems="center" justifyContent="center" height={300}>
              <Text>Loading onboarding...</Text>
            </YStack>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Close button in top-right corner */}
          {!forceShow && (
            <Button
              position="absolute"
              top={Platform.OS === 'ios' ? 50 : 20}
              right={20}
              zIndex={100}
              size="$2"
              circular
              icon={<FontAwesome name="close" size={16} color="#555" />}
              onPress={onClose}
            />
          )}

          {/* Debug/test options */}
          <View style={styles.debugContainer}>
            {/* Hidden tap area to trigger debug options */}
            <Button
              opacity={0}
              width={40}
              height={40}
              position="absolute"
              bottom={0}
              right={0}
              onPress={handleDebugTap}
            />

            {showDebugOptions && (
              <YStack gap="$2" position="absolute" bottom={10} right={10} width={150}>
                <Text size="xs" color="$gray11">
                  Developer Options
                </Text>
                <Button size="$2" theme="red" onPress={handleResetOnboarding}>
                  Reset Onboarding
                </Button>
              </YStack>
            )}
          </View>

          <Onboarding
            slides={slides}
            onDone={handleComplete}
            onSkip={forceShow ? handleComplete : onClose}
            showAgainKey="vromm_onboarding"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  debugContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 100,
    width: 40,
    height: 40,
  },
});
