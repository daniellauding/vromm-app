import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';

interface RecordDrivingSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1500, // Higher than TabNavigator's 100
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 180 + BOTTOM_INSET, // Just enough height for the content
    paddingBottom: 20 + BOTTOM_INSET, // Add extra padding to account for bottom inset
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -TAB_BAR_HEIGHT - BOTTOM_INSET, // Extend beyond bottom nav to fully cover it
    backgroundColor: 'rgba(0,0,0,0.7)', // Make it more opaque
  },
});

const RecordDrivingSheet = ({
  isVisible,
  onClose,
}: RecordDrivingSheetProps) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';
  const handleColor = colorScheme === 'dark' ? '#666' : '#CCC';
  
  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: screenHeight,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  // Handle backdrop press
  const handleBackdropPress = () => {
    onClose();
  };

  if (!isVisible && translateY._value === screenHeight) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]} 
        pointerEvents={isVisible ? "auto" : "none"}
        onTouchEnd={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor,
            transform: [{ translateY }],
            zIndex: 1501, // Above backdrop
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
            <View /> {/* Empty view for spacing */}
            <Text fontWeight="600" fontSize={24} color={textColor}>
              {t('map.recordDriving')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={textColor} />
            </TouchableOpacity>
          </XStack>
        </View>

        <YStack padding="$4" space="$4">
          {/* Content goes here */}
          <Text color={textColor} fontSize={16}>This sheet will allow recording your driving session</Text>
        </YStack>
      </Animated.View>
    </View>
  );
};

// Export the component
export { RecordDrivingSheet };

// Export a version for use with the modal system
export function RecordDrivingModal() {
  const { hideModal } = useModal();
  
  return (
    <RecordDrivingSheet 
      isVisible={true}
      onClose={hideModal}
    />
  );
} 