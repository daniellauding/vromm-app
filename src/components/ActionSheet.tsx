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
import { Text, XStack, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { RecordDrivingModal } from './RecordDrivingSheet';

interface ActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute: () => void;
  onRecordDriving?: () => void;
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
    zIndex: 1500,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20 + BOTTOM_INSET,
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
    bottom: -TAB_BAR_HEIGHT - BOTTOM_INSET,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
});

export function ActionSheet({ isVisible, onClose, onCreateRoute, onRecordDriving }: ActionSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';
  const handleColor = colorScheme === 'dark' ? '#666' : '#CCC';
  const { showModal } = useModal();

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
        }),
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
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  // Handle backdrop press
  const handleBackdropPress = () => {
    onClose();
  };

  // Handle "Create Route" option
  const handleCreateRoute = () => {
    onClose();
    onCreateRoute();
  };

  // Handle "Record Driving" option
  const handleRecordDriving = () => {
    onClose();
    if (onRecordDriving) {
      onRecordDriving();
    } else {
      // Fallback to old behavior if no callback provided
      showModal(<RecordDrivingModal />);
    }
  };

  if (!isVisible && translateY._value === screenHeight) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        onTouchEnd={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor,
            transform: [{ translateY }],
            zIndex: 1501,
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <Text fontWeight="600" fontSize={24} color={textColor} pb="$2">
            {t('map.actions') || 'Actions'}
          </Text>
        </View>

        <YStack>
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleCreateRoute}
          >
            <XStack alignItems="center" gap="$3">
              <Feather name="map-pin" size={24} color={textColor} />
              <Text fontWeight="500" fontSize={18} color={textColor}>
                {t('createRoute.createTitle') || 'Create Route'}
              </Text>
            </XStack>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleRecordDriving}
          >
            <XStack alignItems="center" gap="$3">
              <Feather name="video" size={24} color={textColor} />
              <Text fontWeight="500" fontSize={18} color={textColor}>
                {t('map.recordDriving') || 'Record Driving'}
              </Text>
            </XStack>
          </TouchableOpacity>
        </YStack>
      </Animated.View>
    </View>
  );
}

export function ActionSheetModal({ 
  onCreateRoute, 
  onRecordDriving 
}: { 
  onCreateRoute: () => void;
  onRecordDriving?: () => void;
}) {
  const { hideModal } = useModal();

  return (
    <ActionSheet 
      isVisible={true} 
      onClose={hideModal} 
      onCreateRoute={onCreateRoute}
      onRecordDriving={onRecordDriving}
    />
  );
}
