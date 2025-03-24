import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { YStack, Button } from 'tamagui';
import { Onboarding, OnboardingSlide, completeOnboardingWithVersion } from './Onboarding';
import { fetchOnboardingContent, onContentChange, ContentType } from '../services/contentService';
import { contentItemsToOnboardingSlides } from '../adapters/contentAdapter';
import { clearContentCache } from '../services/contentService';
import { useAuth } from '../context/AuthContext';
import { Text } from './Text';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContentOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  forceShow?: boolean; // Used for first-time users or for testing
}

// Keys for AsyncStorage
const ONBOARDING_KEY = 'vromm_onboarding';

export function ContentOnboardingModal({
  visible,
  onClose,
  forceShow = false
}: ContentOnboardingModalProps) {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  const { user } = useAuth();

  // Load slides function that can be called multiple times
  const loadSlides = useCallback(async () => {
    try {
      setLoading(true);
      // Get content items from the content service
      const contentItems = await fetchOnboardingContent();

      if (contentItems && contentItems.length > 0) {
        // Convert to format expected by Onboarding component
        const onboardingSlides = contentItemsToOnboardingSlides(contentItems);
        setSlides(onboardingSlides);
      } else {
        console.warn('No onboarding content found');
        setSlides([]);
      }
    } catch (error) {
      console.error('Error loading onboarding content:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSlides();
    }
  }, [visible, loadSlides]);

  // Subscribe to content changes
  useEffect(() => {
    // Only subscribe when the modal is visible
    if (!visible) return;

    // Set up subscription to content changes
    const unsubscribe = onContentChange(contentType => {
      // If no content type specified or it's onboarding content, reload
      if (!contentType || contentType === ContentType.ONBOARDING) {
        console.log('Onboarding content changed, reloading...');
        loadSlides();
      }
    });

    // Clean up subscription when component unmounts or modal closes
    return () => {
      unsubscribe();
    };
  }, [visible, loadSlides]);

  const handleComplete = () => {
    completeOnboardingWithVersion(ONBOARDING_KEY);
    onClose();
  };

  // Handle reset onboarding for testing
  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await clearContentCache();
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
              <Text>Loading onboarding content...</Text>
            </YStack>
          </View>
        </View>
      </Modal>
    );
  }

  // If no slides are available, show an error message
  if (slides.length === 0) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <YStack alignItems="center" justifyContent="center" height={300} p="$4">
              <Text>No onboarding content available</Text>
              <Button marginTop="$4" onPress={onClose}>
                Close
              </Button>
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
            showAgainKey={ONBOARDING_KEY}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden'
  },
  debugContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 100,
    width: 40,
    height: 40
  }
});
