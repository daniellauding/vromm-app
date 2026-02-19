import React, { useRef, useEffect, useState } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions, Platform } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import { EventsScreen } from '../screens/EventsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { AppAnalytics } from '../utils/analytics';

const { height } = Dimensions.get('window');

interface EventsSheetProps {
  visible: boolean;
  onClose: () => void;
}

type EventSheetView = 'list' | 'detail' | 'create';

export function EventsSheet({ visible, onClose }: EventsSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Sheet navigation state
  const [currentView, setCurrentView] = useState<EventSheetView>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Reset view when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentView('list');
      setSelectedEventId(null);
    }
  }, [visible]);

  // Navigation helpers
  const handleEventPress = (eventId: string) => {
    AppAnalytics.trackButtonPress('event_open', 'EventsSheet', {
      event_id: eventId,
    }).catch(() => {});

    setSelectedEventId(eventId);
    setCurrentView('detail');
  };

  const handleCreateEvent = () => {
    AppAnalytics.trackButtonPress('create_event', 'EventsSheet').catch(() => {});
    setCurrentView('create');
  };

  const handleBackToEvents = () => {
    setCurrentView('list');
    setSelectedEventId(null);
  };

  const handleSheetClose = () => {
    setCurrentView('list');
    setSelectedEventId(null);
    onClose();
  };

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: Platform.OS === 'web' ? undefined : [{ translateY: sheetTranslateY }],
              ...(Platform.OS === 'web' ? { top: sheetTranslateY } : {}),
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.9}
              maxHeight={height * 0.9}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                {currentView !== 'list' && (
                  <TouchableOpacity onPress={handleBackToEvents} style={{ marginRight: 12 }}>
                    <Feather name="arrow-left" size={24} color={iconColor} />
                  </TouchableOpacity>
                )}
                <Text fontSize="$6" fontWeight="bold" color="$color" flex={1}>
                  {currentView === 'list'
                    ? 'Events'
                    : currentView === 'detail'
                      ? 'Event Details'
                      : 'Create Event'}
                </Text>
                {currentView === 'list' && (
                  <TouchableOpacity onPress={handleCreateEvent} style={{ marginRight: 12 }}>
                    <Feather name="plus" size={24} color={iconColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSheetClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack>

              {/* Dynamic Content Based on View */}
              <YStack flex={1}>
                {currentView === 'list' && <EventsScreenWrapper onEventPress={handleEventPress} />}
                {currentView === 'detail' && selectedEventId && (
                  <EventDetailScreenWrapper eventId={selectedEventId} />
                )}
                {currentView === 'create' && (
                  <CreateEventScreenWrapper onEventCreated={handleBackToEvents} />
                )}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Wrapper components to handle navigation properly
const EventsScreenWrapper = ({ onEventPress }: { onEventPress: (id: string) => void }) => {
  return <EventsScreen onEventPress={onEventPress} />;
};

const EventDetailScreenWrapper = ({ eventId }: { eventId: string }) => {
  // Create a proper route object that EventDetailScreen expects
  const mockRoute = {
    params: { eventId },
    key: `event-detail-${eventId}`,
    name: 'EventDetail',
  };

  return <EventDetailScreen route={mockRoute as any} />;
};

const CreateEventScreenWrapper = ({ onEventCreated }: { onEventCreated: () => void }) => {
  return <CreateEventScreen onEventCreated={onEventCreated} />;
};
