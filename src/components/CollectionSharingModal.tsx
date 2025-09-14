import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, Pressable, useColorScheme, ScrollView } from 'react-native';
import { Text, XStack, YStack, Button, Input, TextArea } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { collectionSharingService, CollectionShareRequest } from '../services/collectionSharingService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface CollectionSharingModalProps {
  isVisible: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  onInvitationSent?: () => void;
}

export function CollectionSharingModal({
  isVisible,
  onClose,
  collectionId,
  collectionName,
  onInvitationSent,
}: CollectionSharingModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User search and selection state (matching GettingStarted.tsx pattern)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);

  // Animation refs (matching AddToPresetSheet.tsx pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Show/hide functions (matching AddToPresetSheet.tsx pattern)
  const showSheet = () => {
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideSheet = () => {
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Add a small delay to ensure the animation is completely finished
      setTimeout(() => {
        onClose();
      }, 50);
    });
  };

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      showSheet();
    } else {
      hideSheet();
    }
  }, [isVisible]);

  const handleSendInvitation = async () => {
    console.log('🎯 [CollectionSharingModal] handleSendInvitation called');
    console.log('🎯 [CollectionSharingModal] selectedUsers:', selectedUsers.length);
    console.log('🎯 [CollectionSharingModal] user:', user?.id);
    console.log('🎯 [CollectionSharingModal] collectionId:', collectionId);
    console.log('🎯 [CollectionSharingModal] message:', message);

    if (selectedUsers.length === 0) {
      console.log('❌ [CollectionSharingModal] No users selected');
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.selectUsersRequired') || 'Please select at least one user',
        type: 'error'
      });
      return;
    }

    if (!user?.id) {
      console.log('❌ [CollectionSharingModal] User not authenticated');
      showToast({
        title: t('common.error') || 'Error',
        message: t('common.notAuthenticated') || 'Not authenticated',
        type: 'error'
      });
      return;
    }

    console.log('🚀 [CollectionSharingModal] Starting to send invitations...');
    setIsLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Send invitations to each selected user
      for (const targetUser of selectedUsers) {
        console.log('📤 [CollectionSharingModal] Sending invitation to:', targetUser.email);
        
        if (!targetUser.email) {
          console.log('❌ [CollectionSharingModal] No email for user:', targetUser);
          failCount++;
          continue;
        }
        
        try {
          const request: CollectionShareRequest = {
            collectionId,
            collectionName,
            invitedUserEmail: targetUser.email,
            message: message.trim() || undefined,
          };

          console.log('📤 [CollectionSharingModal] Request:', request);
          const result = await collectionSharingService.createCollectionInvitation(request, user.id);
          console.log('📤 [CollectionSharingModal] Result:', result);

          if (result.success) {
            console.log('✅ [CollectionSharingModal] Success for:', targetUser.email);
            successCount++;
          } else if (result.error?.includes('already has a pending invitation')) {
            console.log('⚠️ [CollectionSharingModal] Already invited:', targetUser.email);
            successCount++; // Treat as success since invitation already exists
          } else {
            console.log('❌ [CollectionSharingModal] Failed for:', targetUser.email, result.error);
            failCount++;
          }
        } catch (error) {
          console.error('❌ [CollectionSharingModal] Error sending invitation to:', targetUser.email, error);
          failCount++;
        }
      }

      console.log('📊 [CollectionSharingModal] Final results - Success:', successCount, 'Failed:', failCount);

      if (successCount > 0) {
        console.log('✅ [CollectionSharingModal] Showing success toast and closing modal');
        const message = failCount > 0 
          ? `${successCount} invitation(s) processed (some users were already invited)`
          : t('collectionSharing.invitationsSentMessage')?.replace('{count}', successCount.toString()) || `${successCount} invitation(s) sent successfully`;
        
        showToast({
          title: t('collectionSharing.invitationsSent') || 'Invitations Sent',
          message: message,
          type: 'success'
        });
        
        setSelectedUsers([]);
        setMessage('');
        setSearchQuery('');
        setSearchResults([]);
        
        console.log('🔄 [CollectionSharingModal] Calling onInvitationSent callback');
        onInvitationSent?.();
        
        console.log('🚪 [CollectionSharingModal] Closing modal with delay to show toast');
        // Add delay to ensure toast is visible before closing modal
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        console.log('❌ [CollectionSharingModal] All invitations failed, showing error toast');
        showToast({
          title: t('common.error') || 'Error',
          message: t('collectionSharing.failedToSend') || 'Failed to send invitations',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('❌ [CollectionSharingModal] Unexpected error:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.failedToSend') || 'Failed to send invitations',
        type: 'error'
      });
    } finally {
      console.log('🏁 [CollectionSharingModal] Setting loading to false');
      setIsLoading(false);
    }
  };

  // User search function (matching GettingStarted.tsx pattern)
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleClose = () => {
    setEmail('');
    setMessage('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    hideSheet();
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={hideSheet}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={hideSheet} />
          <Animated.View
            style={{
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor="$background"
              padding="$4"
              paddingBottom={24}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              minHeight="60%"
            >
              {/* Header */}
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center" flex={1}>
                  {t('collectionSharing.shareCollection') || 'Share Collection'}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    padding: 8,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                    borderRadius: 8,
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                </TouchableOpacity>
              </XStack>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <YStack gap="$4">
                    <YStack>
                      <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
                        {t('collectionSharing.collectionName') || 'Collection'}
                      </Text>
                      <Text fontSize="$3" color="$gray10" backgroundColor="$backgroundHover" padding="$3" borderRadius="$3">
                        {collectionName}
                      </Text>
                    </YStack>

                    {/* Show selected users */}
                    {selectedUsers.length > 0 && (
                      <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                        <Text fontSize="$4" fontWeight="600" color="$color">
                          {t('collectionSharing.selectedUsers') || 'Selected Users'} ({selectedUsers.length}):
                        </Text>
                        {selectedUsers.map((user) => (
                          <XStack key={user.id} gap="$2" alignItems="center">
                            <YStack flex={1}>
                              <Text fontSize="$4" fontWeight="600" color="$color">
                                {user.full_name || user.email}
                              </Text>
                              <Text fontSize="$3" color="$gray11">
                                {user.email} • {user.role || 'user'}
                              </Text>
                            </YStack>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedUsers(prev => 
                                  prev.filter(u => u.id !== user.id)
                                );
                              }}
                              style={{ 
                                padding: 8,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 6,
                              }}
                              activeOpacity={0.6}
                            >
                              <Feather name="x" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </XStack>
                        ))}
                      </YStack>
                    )}

                    <YStack>
                      <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
                        {t('collectionSharing.searchUsers') || 'Search Users'}
                      </Text>
                      <Input
                        placeholder={t('collectionSharing.searchPlaceholder') || 'Search by name or email...'}
                        value={searchQuery}
                        onChangeText={handleSearchUsers}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        placeholderTextColor="$gray10"
                      />
                    </YStack>

                    {/* Search Results */}
                    {searchQuery.length >= 2 && (
                      <ScrollView style={{ maxHeight: 200 }}>
                        <YStack gap="$2">
                          {searchResults.length === 0 && (
                            <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                              {t('collectionSharing.noUsersFound') || 'No users found'}
                            </Text>
                          )}
                          
                          {searchResults.map((user) => {
                            const isSelected = selectedUsers.some(u => u.id === user.id);
                            return (
                              <TouchableOpacity
                                key={user.id}
                                onPress={() => {
                                  if (isSelected) {
                                    setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                  } else {
                                    setSelectedUsers(prev => [...prev, user]);
                                  }
                                }}
                                style={{
                                  padding: 12,
                                  borderRadius: 8,
                                  borderWidth: isSelected ? 2 : 1,
                                  borderColor: isSelected ? '#00E6C3' : '#ccc',
                                  backgroundColor: isSelected ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                                  marginVertical: 4,
                                }}
                              >
                                <XStack gap={8} alignItems="center">
                                  <YStack flex={1}>
                                    <Text color="$color" fontSize={14} fontWeight="600">
                                      {user.full_name || 'Unknown User'}
                                    </Text>
                                    <Text fontSize={12} color="$gray11">
                                      {user.email} • {user.role}
                                    </Text>
                                  </YStack>
                                  {isSelected ? (
                                    <Feather name="check" size={16} color="#00E6C3" />
                                  ) : (
                                    <Feather name="plus-circle" size={16} color="#ccc" />
                                  )}
                                </XStack>
                              </TouchableOpacity>
                            );
                          })}
                        </YStack>
                      </ScrollView>
                    )}

                    <YStack>
                      <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
                        {t('collectionSharing.message') || 'Message (Optional)'}
                      </Text>
                      <TextArea
                        placeholder={t('collectionSharing.messagePlaceholder') || 'Add a personal message...'}
                        value={message}
                        onChangeText={setMessage}
                        minHeight={80}
                        maxLength={500}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        placeholderTextColor="$gray10"
                      />
                      <Text fontSize="$2" color="$gray10" textAlign="right">
                        {message.length}/500
                      </Text>
                    </YStack>
                  </YStack>
                </ScrollView>

                <YStack gap="$2" marginTop="$4">
                  <Button
                    backgroundColor="#00E6C3"
                    color="#000000"
                    size="lg"
                    onPress={() => {
                      console.log('🔘 [CollectionSharingModal] Send button pressed');
                      handleSendInvitation();
                    }}
                    disabled={isLoading || selectedUsers.length === 0}
                  >
                    <Text color="#000000" fontWeight="700">
                      {isLoading 
                        ? (t('collectionSharing.sending') || 'Sending...') 
                        : (t('collectionSharing.sendInvitations') || 'Send Invitations')
                      }
                    </Text>
                  </Button>
                  <Button
                    variant="outlined"
                    size="lg"
                    onPress={handleClose}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>
    );
  }

// Styles removed - now using Tamagui components and AddToPresetSheet.tsx pattern
