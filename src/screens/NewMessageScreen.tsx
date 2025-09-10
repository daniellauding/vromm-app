import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Avatar, Input, Spinner, Button } from 'tamagui';
import { ArrowLeft, Search, MessageCircle } from '@tamagui/lucide-icons';
import { messageService } from '../services/messageService';
import { useNavigation } from '@react-navigation/native';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NewMessageScreenProps {
  onMessageSent?: () => void;
}

export const NewMessageScreen: React.FC<NewMessageScreenProps> = ({ onMessageSent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const results = await messageService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onMessageSent) {
      onMessageSent();
    } else {
      navigation.goBack();
    }
  };

  const startConversation = async (user: Profile) => {
    try {
      setCreating(true);

      // Check if conversation already exists
      const conversations = await messageService.getConversations();
      const existingConversation = conversations.find(
        (conv) => !conv.is_group && conv.participants?.some((p) => p.user_id === user.id),
      );

      if (existingConversation) {
        // Navigate to existing conversation or call callback
        if (onMessageSent) {
          onMessageSent();
        } else {
          // @ts-ignore - navigation type issue
          navigation.navigate('Conversation', { conversationId: existingConversation.id });
        }
      } else {
        // Create new conversation
        const conversation = await messageService.createConversation([user.id]);
        if (onMessageSent) {
          onMessageSent();
        } else {
          // @ts-ignore - navigation type issue
          navigation.navigate('Conversation', { conversationId: conversation.id });
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }: { item: Profile }) => {
    return (
      <TouchableOpacity onPress={() => startConversation(item)} disabled={creating}>
        <XStack
          padding={16}
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.1)"
          alignItems="center"
          gap={12}
          opacity={creating ? 0.5 : 1}
        >
          <Avatar circular size={48}>
            <Avatar.Image
              source={{
                uri:
                  item.avatar_url ||
                  `https://ui-avatars.com/api/?name=${item.full_name || 'User'}&background=00FFBC&color=000`,
              }}
            />
            <Avatar.Fallback backgroundColor="$gray8" />
          </Avatar>

          <YStack flex={1} gap={4}>
            <Text fontSize={16} fontWeight="bold" color="$color">
              {item.full_name || 'Unknown User'}
            </Text>

            {item.bio && (
              <Text fontSize={14} color="$gray11" numberOfLines={1}>
                {item.bio}
              </Text>
            )}
          </YStack>

          <MessageCircle size={20} color="#00FFBC" />
        </XStack>
      </TouchableOpacity>
    );
  };

  return (
    <YStack flex={1} backgroundColor="#0F172A">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        alignItems="center"
        gap={12}
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text fontSize={20} fontWeight="bold" color="$color" flex={1}>
          New Message
        </Text>
      </XStack>

      {/* Search Input */}
      <YStack padding={16} gap={16}>
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.1)"
          borderRadius={12}
          paddingHorizontal={16}
          paddingVertical={12}
          alignItems="center"
          gap={12}
        >
          <Search size={20} color="rgba(255, 255, 255, 0.7)" />
          <Input
            flex={1}
            placeholder="Search users..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor="transparent"
            borderWidth={0}
            color="$color"
            fontSize={16}
          />
        </XStack>
      </YStack>

      {/* Search Results */}
      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00FFBC" />
          <Text color="$color" marginTop={16}>
            Searching users...
          </Text>
        </YStack>
      ) : searchQuery.trim().length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Search size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text fontSize={18} color="$gray11" textAlign="center" marginTop={16}>
            Search for users
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            Start typing to find people to message
          </Text>
        </YStack>
      ) : searchResults.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Text fontSize={18} color="$gray11" textAlign="center">
            No users found
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            Try a different search term
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </YStack>
  );
};
