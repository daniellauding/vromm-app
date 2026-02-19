import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { RecordDrivingModal, RecordedRouteData } from './RecordDrivingModal';
import { CreateRouteSheet } from './CreateRouteSheet';

interface ActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute: (routeData?: RecordedRouteData) => void;
  onMaximizeWizard?: (routeData: any) => void; // Callback for maximizing wizard
  onCreateEvent?: () => void; // Callback for creating event
  onNavigateToMap?: (routeId: string) => void; // Callback for navigation
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

export function ActionSheet({
  isVisible,
  onClose,
  onCreateRoute,
  onNavigateToMap,
}: ActionSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const backgroundColor = theme.background?.val || '#FFFFFF';
  const textColor = theme.color?.val || '#000000';
  const borderColor = theme.borderColor?.val || '#DDD';
  const { showModal, hideModal } = useModal();

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
  const handleBackdropPress = React.useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle "Create Route Sheet" option
  const handleCreateRouteSheet = React.useCallback(() => {
    onClose();
    showModal(
      <CreateRouteSheet
        visible={true}
        onClose={() => {
          hideModal();
        }}
        onRouteCreated={() => {
          onCreateRoute();
        }}
        onRouteUpdated={() => {}}
        onNavigateToMap={onNavigateToMap}
      />,
    );
  }, [onCreateRoute, onClose, onNavigateToMap, hideModal, showModal]);

  // Handle "Record Driving" option
  const handleRecordDriving = React.useCallback(() => {
    onClose();

    showModal(
      <RecordDrivingModal
        onCreateRoute={(routeData) => {
          // Close RecordDrivingModal first
          hideModal();
          // Then show CreateRouteSheet with the recorded route data
          setTimeout(() => {
            showModal(
              <CreateRouteSheet
                visible={true}
                onClose={() => {
                  hideModal();
                }}
                onRouteCreated={() => {
                  onCreateRoute(routeData); // Call parent callback with route data
                }}
                onRouteUpdated={() => {}}
                onNavigateToMap={onNavigateToMap}
                recordedRouteData={routeData} // Pass the recorded route data to CreateRouteSheet
              />,
            );
          }, 300);
        }}
      />,
    );
  }, [onCreateRoute, onClose, onNavigateToMap, hideModal, showModal]);

  if (!isVisible) return null;

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
            transform: Platform.OS === 'web' ? undefined : [{ translateY }],
            ...(Platform.OS === 'web' ? { top: translateY } : {}),
            zIndex: 1501,
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <Text fontWeight="600" fontSize={24} color={textColor} pb="$2">
            {t('map.actions') || 'Actions'}
          </Text>
        </View>

        <YStack>
          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleRecordDriving}
          >
            <XStack alignItems="center" gap="$3" width="100%">
              <Feather name="video" size={24} color={textColor} />
              <YStack flex={1}>
                <Text fontWeight="600" fontSize={18} color={textColor}>
                  {t('map.recordDriving') || 'Record Driving'}
                </Text>
                <Text fontSize={14} color={colorScheme === 'dark' ? '#999' : '#666'}>
                  {t('map.recordDrivingDescription') ||
                    'Record your driving session with GPS tracking'}
                </Text>
              </YStack>
            </XStack>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: 'transparent' }]}
            onPress={handleCreateRouteSheet}
          >
            <XStack alignItems="center" gap="$3" width="100%">
              <Feather name="edit-3" size={24} color={textColor} />
              <YStack flex={1}>
                <Text fontWeight="600" fontSize={18} color={textColor}>
                  {t('createRoute.createTitle') || 'Create Route'}
                </Text>
                <Text fontSize={14} color={colorScheme === 'dark' ? '#999' : '#666'}>
                  {t('createRoute.createDescription') || 'Plan and create a new driving route'}
                </Text>
              </YStack>
            </XStack>
          </TouchableOpacity>
        </YStack>
      </Animated.View>
    </View>
  );
}

export function ActionSheetModal({
  onCreateRoute,
  onMaximizeWizard,
  onCreateEvent,
  onNavigateToMap,
}: {
  onCreateRoute: (routeData?: RecordedRouteData) => void;
  onMaximizeWizard?: (routeData: any) => void;
  onCreateEvent?: () => void;
  onNavigateToMap?: (routeId: string) => void;
}) {
  const { hideModal } = useModal();

  return (
    <ActionSheet
      isVisible={true}
      onClose={hideModal}
      onCreateRoute={onCreateRoute}
      onMaximizeWizard={onMaximizeWizard}
      onCreateEvent={onCreateEvent}
      onNavigateToMap={onNavigateToMap}
    />
  );
}
