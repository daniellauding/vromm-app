import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { YStack, Button } from 'tamagui';
import { OnboardingInteractive, completeOnboardingWithVersion } from './OnboardingInteractive';
import { useAuth } from '../context/AuthContext';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

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
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  // Listen for navigation focus to reopen modal when returning from onboarding screens
  useFocusEffect(
    React.useCallback(() => {
      // If we were temporarily closed and the screen comes back into focus, reopen
      if (isTemporarilyClosed && visible) {
        // Screen focused - reopening modal
        setIsTemporarilyClosed(false);
      }
    }, [isTemporarilyClosed, visible])
  );

  const handleComplete = () => {
    completeOnboardingWithVersion('interactive_onboarding', user?.id);
    onClose();
  };

  // Handle reset onboarding for testing
  const handleResetOnboarding = async () => {
    try {
      // Reset AsyncStorage flags
      await AsyncStorage.multiRemove([
        'interactive_onboarding',
        'vromm_first_login',
        'vromm_onboarding',
        'vromm_app_tour_completed'
      ]);
      
      // Reset user's profile flags (USER-BASED)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            interactive_onboarding_completed: false,
            interactive_onboarding_version: null,
          })
          .eq('id', user.id);
          
        if (error) {
          console.error('Error resetting user profile onboarding flags:', error);
        } else {
          console.log('🎯 [OnboardingModal] Reset user profile onboarding flags for:', user.id);
        }
      }
      
      // Close modal first
      onClose();
      // Show confirmation
      alert('All onboarding flags (device + user) have been reset. Restart the app to see onboarding again.');
    } catch (error) {
      console.error('Error resetting interactive onboarding:', error);
      alert('Failed to reset onboarding. Check console for details.');
    }
  };

  // Toggle debug options with tap
  const handleDebugTap = () => {
    setShowDebugOptions(!showDebugOptions);
  };

  // Check current storage values for debugging
  const handleCheckStorage = async () => {
    try {
      const values = await AsyncStorage.multiGet([
        'interactive_onboarding',
        'vromm_first_login',
        'vromm_onboarding',
        'vromm_app_tour_completed'
      ]);
      
      const storageState = values.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string | null>);
      
      console.log('🎯 [OnboardingModal] Current AsyncStorage state:', storageState);
      alert(`Storage State:\n${JSON.stringify(storageState, null, 2)}`);
    } catch (error) {
      console.error('Error checking storage:', error);
      alert('Failed to check storage. Check console for details.');
    }
  };

  const handleCloseModal = () => {
    setIsTemporarilyClosed(true);
  };

  const handleReopenModal = () => {
    setIsTemporarilyClosed(false);
  };

  // Render check without excessive logging to prevent console flooding
  if (!visible || isTemporarilyClosed) {
    return null;
  }

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

  // Rendering OnboardingModalInteractive
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Close button in top-right corner */}
          {/* Removed X close button */}

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
                <Button size="$2" theme="blue" onPress={handleCheckStorage}>
                  Check Storage
                </Button>
                <Button size="$2" theme="red" onPress={handleResetOnboarding}>
                  Reset All Onboarding
                </Button>
              </YStack>
            )}
          </View>

          <OnboardingInteractive
            onDone={handleComplete}
            onSkip={forceShow ? handleComplete : onClose}
            showAgainKey="interactive_onboarding"
            onCloseModal={handleCloseModal}
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
