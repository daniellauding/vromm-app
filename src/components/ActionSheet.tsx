import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { RecordDrivingModal, RecordedRouteData } from './RecordDrivingSheet';
import { CreateRouteSheet } from './CreateRouteSheet';

interface ActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute: (routeData?: RecordedRouteData) => void;
  onMaximizeWizard?: (routeData: any) => void; // Callback for maximizing wizard
  // onCreateEvent?: () => void; // Callback for creating event
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

export function ActionSheet({ isVisible, onClose, onCreateRoute, onMaximizeWizard, onCreateEvent, onNavigateToMap }: ActionSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';
  const handleColor = colorScheme === 'dark' ? '#666' : '#CCC';
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
  const handleBackdropPress = () => {
    onClose();
  };

  // Handle "Create Route" option
  const handleCreateRoute = () => {
    console.log('🎭 ==================== ACTION SHEET - CREATE ROUTE ====================');
    console.log('🎭 ActionSheet Create Route pressed');
    console.log('🎭 About to close ActionSheet and call onCreateRoute...');

    onClose();
    console.log('🎭 ActionSheet closed, calling onCreateRoute callback...');
    onCreateRoute();
    console.log('🎭 ✅ onCreateRoute callback completed');
  };

  // Handle "Create Route Sheet" option
  const handleCreateRouteSheet = () => {
    console.log('🎭 ==================== ACTION SHEET - CREATE ROUTE SHEET ====================');
    console.log('🎭 ActionSheet Create Route Sheet pressed');
    console.log('🎭 About to close ActionSheet and show CreateRouteSheet...');

    onClose();
    console.log('🎭 ActionSheet closed, showing CreateRouteSheet...');
    showModal(
      <CreateRouteSheet
        visible={true}
        onClose={() => {
          console.log('🎭 [ActionSheet] CreateRouteSheet onClose called - closing modal');
          hideModal();
        }}
        onRouteCreated={(routeId) => {
          console.log('🎭 ✅ Route created with ID:', routeId);
          // Optionally call onCreateRoute with the new route ID
          onCreateRoute();
        }}
        onRouteUpdated={(routeId) => {
          console.log('🎭 ✅ Route updated with ID:', routeId);
        }}
        onNavigateToMap={onNavigateToMap}
      />
    );
    console.log('🎭 ✅ CreateRouteSheet shown');
  };

  // Handle "Share Route" option (new wizard)
  const handleShareRoute = () => {
    console.log('🧙‍♂️ ==================== ACTION SHEET - SHARE ROUTE ====================');
    console.log('🧙‍♂️ ActionSheet Share Route pressed');
    console.log('🧙‍♂️ About to close ActionSheet and show RouteWizardSheet...');

    onClose();
    console.log('🧙‍♂️ ActionSheet closed, showing RouteWizardSheet...');
    
    // Import and show RouteWizardSheet dynamically
    import('./RouteWizardSheet').then(({ RouteWizardSheet }) => {
      console.log('🧙‍♂️ RouteWizardSheet imported successfully');
      console.log('🧙‍♂️ onCreateRoute:', typeof onCreateRoute);
      console.log('🧙‍♂️ onMaximizeWizard:', typeof onMaximizeWizard);
      
      showModal(<RouteWizardSheet onCreateRoute={onCreateRoute} onMaximize={onMaximizeWizard} />);
      console.log('🧙‍♂️ ✅ RouteWizardSheet modal shown');
    }).catch(error => {
      console.error('🧙‍♂️ ❌ Failed to import RouteWizardSheet:', error);
      Alert.alert('Error', 'Failed to load route wizard. Please try again.');
    });
    
    console.log('🧙‍♂️ ✅ Dynamic import initiated');
  };

  // Handle "Record Driving" option
  const handleRecordDriving = () => {
    console.log('🎭 ==================== ACTION SHEET - RECORD DRIVING ====================');
    console.log('🎭 ActionSheet Record Driving pressed');
    console.log('🎭 About to close ActionSheet and show RecordDrivingModal...');

    onClose();
    console.log('🎭 ActionSheet closed, showing RecordDrivingModal...');
    showModal(<RecordDrivingModal onCreateRoute={onCreateRoute} />);
    console.log('🎭 ✅ RecordDrivingModal shown');
  };

  // Handle "Create Event" option
  const handleCreateEvent = () => {
    console.log('🎉 ==================== ACTION SHEET - CREATE EVENT ====================');
    console.log('🎉 ActionSheet Create Event pressed');
    console.log('🎉 About to close ActionSheet and call onCreateEvent...');

    onClose();
    console.log('🎉 ActionSheet closed, calling onCreateEvent callback...');
    if (onCreateEvent) {
      onCreateEvent();
      console.log('🎉 ✅ onCreateEvent callback completed');
    } else {
      console.warn('🎉 ⚠️ onCreateEvent callback not provided');
    }
  };

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
            transform: [{ translateY }],
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
          {/* <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleShareRoute}
          >
            <XStack alignItems="center" gap="$3" justifyContent="space-between">
              <XStack alignItems="center" gap="$3">
                <Feather name="share-2" size={24} color="#69e3c4" />
                <Text fontWeight="500" fontSize={18} color={textColor}>
                  Share a Route
                </Text>
              </XStack>
              <View
                style={{
                  backgroundColor: '#69e3c4',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}
              >
                <Text fontSize={10} fontWeight="bold" color="white">
                  NEW
                </Text>
              </View>
            </XStack>
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleCreateEvent}
          >
            <XStack alignItems="center" gap="$3">
              <Feather name="calendar" size={24} color="#F59E0B" />
              <Text fontWeight="500" fontSize={18} color={textColor}>
                Create Event
              </Text>
            </XStack>
          </TouchableOpacity> */}

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

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: borderColor }]}
            onPress={handleCreateRouteSheet}
          >
            <XStack alignItems="center" gap="$3">
              <Feather name="edit-3" size={24} color={textColor} />
              <Text fontWeight="500" fontSize={18} color={textColor}>
                {t('createRoute.createTitle') || 'Create Route'}
              </Text>
            </XStack>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: 'transparent' }]}
            onPress={handleCreateRoute}
          >
            <XStack alignItems="center" gap="$3">
              <Feather name="settings" size={24} color={textColor} />
              <Text fontWeight="500" fontSize={18} color={textColor}>
                {t('createRoute.advancedCreate') || 'Advanced Create'}
              </Text>
            </XStack>
          </TouchableOpacity> */}
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

  return <ActionSheet isVisible={true} onClose={hideModal} onCreateRoute={onCreateRoute} onMaximizeWizard={onMaximizeWizard} onCreateEvent={onCreateEvent} onNavigateToMap={onNavigateToMap} />;
}
