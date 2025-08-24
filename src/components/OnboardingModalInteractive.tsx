import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { YStack, Button } from 'tamagui';
import { OnboardingInteractive, completeOnboardingWithVersion } from './OnboardingInteractive';
import { useAuth } from '../context/AuthContext';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingModalInteractiveProps {
  visible: boolean;
  onClose: () => void;
  forceShow?: boolean; // Used for first-time users or for testing
}

export function OnboardingModalInteractive({ 
  visible, 
  onClose, 
  forceShow = false 
}: OnboardingModalInteractiveProps) {
  const [loading, setLoading] = useState(false);
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  const { user } = useAuth();

  const handleComplete = () => {
    completeOnboardingWithVersion('interactive_onboarding');
    onClose();
  };

  // Handle reset onboarding for testing
  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('interactive_onboarding');
      await AsyncStorage.removeItem('vromm_first_login');
      // Close modal first
      onClose();
      // Show confirmation
      alert('Interactive onboarding has been reset. Restart the app to see onboarding again.');
    } catch (error) {
      console.error('Error resetting interactive onboarding:', error);
      alert('Failed to reset onboarding. Check console for details.');
    }
  };

  // Toggle debug options with tap
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
              <Text>Loading interactive onboarding...</Text>
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
              backgroundColor="rgba(0,0,0,0.1)"
              icon={<Feather name="x" size={16} color="#555" />}
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
                  Reset Interactive Onboarding
                </Button>
              </YStack>
            )}
          </View>

          <OnboardingInteractive
            onDone={handleComplete}
            onSkip={forceShow ? handleComplete : onClose}
            showAgainKey="interactive_onboarding"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 0,
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
