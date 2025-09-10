import React, { useRef, useEffect, useState } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { NewMessageScreen } from '../screens/NewMessageScreen';
import { AppAnalytics } from '../utils/analytics';

const { height } = Dimensions.get('window');

interface MessagesSheetProps {
  visible: boolean;
  onClose: () => void;
}

type SheetView = 'list' | 'conversation' | 'newMessage';

export function MessagesSheet({ visible, onClose }: MessagesSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Sheet navigation state
  const [currentView, setCurrentView] = useState<SheetView>('list');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Reset view when sheet opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentView('list');
      setSelectedConversationId(null);
    }
  }, [visible]);

  // Navigation helpers
  const handleConversationPress = (conversationId: string) => {
    AppAnalytics.trackButtonPress('conversation_open', 'MessagesSheet', {
      conversation_id: conversationId,
    }).catch(() => {});

    setSelectedConversationId(conversationId);
    setCurrentView('conversation');
  };

  const handleNewMessage = () => {
    AppAnalytics.trackButtonPress('new_message', 'MessagesSheet').catch(() => {});
    setCurrentView('newMessage');
  };

  const handleBackToMessages = () => {
    setCurrentView('list');
    setSelectedConversationId(null);
  };

  const handleSheetClose = () => {
    setCurrentView('list');
    setSelectedConversationId(null);
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
              transform: [{ translateY: sheetTranslateY }],
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
                  <TouchableOpacity onPress={handleBackToMessages} style={{ marginRight: 12 }}>
                    <Feather name="arrow-left" size={24} color={iconColor} />
                  </TouchableOpacity>
                )}
                <Text fontSize="$6" fontWeight="bold" color="$color" flex={1}>
                  {currentView === 'list' ? 'Messages' : 
                   currentView === 'conversation' ? 'Conversation' : 
                   'New Message'}
                </Text>
                {currentView === 'list' && (
                  <TouchableOpacity onPress={handleNewMessage} style={{ marginRight: 12 }}>
                    <Feather name="plus" size={24} color={iconColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSheetClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack>

              {/* Dynamic Content Based on View */}
              <YStack flex={1}>
                {currentView === 'list' && (
                  <MessagesScreenWrapper onConversationPress={handleConversationPress} />
                )}
                {currentView === 'conversation' && selectedConversationId && (
                  <ConversationScreenWrapper conversationId={selectedConversationId} />
                )}
                {currentView === 'newMessage' && (
                  <NewMessageScreenWrapper onMessageSent={handleBackToMessages} />
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
const MessagesScreenWrapper = ({ onConversationPress }: { onConversationPress: (id: string) => void }) => {
  return (
    <MessagesScreen 
      onConversationPress={onConversationPress}
    />
  );
};

const ConversationScreenWrapper = ({ conversationId }: { conversationId: string }) => {
  // Create a proper route object that ConversationScreen expects
  const mockRoute = {
    params: { conversationId },
    key: `conversation-${conversationId}`,
    name: 'Conversation',
  };

  return (
    <ConversationScreen route={mockRoute as any} />
  );
};

const NewMessageScreenWrapper = ({ onMessageSent }: { onMessageSent: () => void }) => {
  return (
    <NewMessageScreen 
      onMessageSent={onMessageSent}
    />
  );
};
