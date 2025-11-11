import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput as RNTextInput,
  useColorScheme,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, TextArea } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { Button } from '../../components/Button';

const { height } = Dimensions.get('window');

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  avatar_url?: string;
}

interface ConnectionSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedRole: 'student' | 'instructor';
}

export const ConnectionSelectionSheet = ({
  visible,
  onClose,
  selectedRole,
}: ConnectionSelectionSheetProps) => {
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const { user, profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<Profile[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(height)).current;

  // Reanimated values for gestures
  const translateY = useSharedValue(height);
  const backdropOpacityShared = useSharedValue(0);

  const snapPoints = useMemo(() => {
    return {
      large: height * 0.1,
      medium: height * 0.4,
      small: height * 0.7,
      mini: height * 0.85,
      dismissed: height,
    };
  }, []);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);

  // Helper function to get translation with fallback
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  // Show/hide animations
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: snapPoints.large,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      translateY.value = withSpring(snapPoints.large, { damping: 50, stiffness: 400 });
      backdropOpacityShared.value = withSpring(1);
      currentState.value = snapPoints.large;
      setCurrentSnapPoint(snapPoints.large);
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: height,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      translateY.value = withSpring(height, { damping: 50, stiffness: 400 });
      backdropOpacityShared.value = withSpring(0);
    }
  }, [visible, snapPoints]);

  // Pan gesture for drag to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = currentState.value + event.translationY;
      if (newPosition >= snapPoints.large && newPosition <= snapPoints.dismissed) {
        translateY.value = newPosition;
      }
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentPosition = translateY.value;

      if (velocity > 500 || currentPosition > snapPoints.small) {
        translateY.value = withSpring(snapPoints.dismissed, { damping: 50, stiffness: 400 });
        backdropOpacityShared.value = withSpring(0);
        runOnJS(onClose)();
      } else if (currentPosition < snapPoints.medium) {
        translateY.value = withSpring(snapPoints.large, { damping: 50, stiffness: 400 });
        currentState.value = snapPoints.large;
        runOnJS(setCurrentSnapPoint)(snapPoints.large);
      } else {
        translateY.value = withSpring(snapPoints.medium, { damping: 50, stiffness: 400 });
        currentState.value = snapPoints.medium;
        runOnJS(setCurrentSnapPoint)(snapPoints.medium);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityShared.value,
  }));

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);

      try {
        // Search based on user's role
        const targetRole = selectedRole === 'student' ? 'instructor' : 'student';

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url')
          .eq('role', targetRole)
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) {
          console.error('Error searching users:', error);
          return;
        }

        // Filter out already selected connections
        const filtered = (data || []).filter(
          (user) => !selectedConnections.find((c) => c.id === user.id)
        );

        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedRole, selectedConnections]);

  // Handle connection selection
  const toggleConnection = (profile: Profile) => {
    setSelectedConnections((prev) => {
      const exists = prev.find((c) => c.id === profile.id);
      if (exists) {
        return prev.filter((c) => c.id !== profile.id);
      }
      return [...prev, profile];
    });
  };

  // Send connection requests
  const handleSendRequests = async () => {
    if (selectedConnections.length === 0) {
      Alert.alert(
        getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
        getTranslation(
          'connections.selectAtLeastOne',
          language === 'sv'
            ? 'Välj minst en person att ansluta till'
            : 'Select at least one person to connect with'
        )
      );
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const connection of selectedConnections) {
        // Determine relationship type and target role
        const relationshipType =
          selectedRole === 'student'
            ? 'student_invites_supervisor'
            : 'supervisor_invites_student';
        const targetRole = selectedRole === 'student' ? 'instructor' : 'student';

        // Create invitation
        const { error: inviteError } = await supabase.from('invitations').insert({
          email: connection.email.toLowerCase(),
          role: targetRole,
          invited_by: user?.id,
          metadata: {
            supervisorName: profile?.full_name || user?.email,
            inviterRole: selectedRole,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: connection.id,
            targetUserName: connection.full_name,
            customMessage: customMessage.trim() || undefined,
          },
        });

        if (inviteError) {
          console.error('Error creating invitation:', inviteError);
          failCount++;
          continue;
        }

        // Create notification
        const notificationType =
          selectedRole === 'student' ? 'supervisor_invitation' : 'student_invitation';
        const baseMessage =
          selectedRole === 'student'
            ? `${profile?.full_name || user?.email || 'Someone'} wants you to be their supervisor`
            : `${profile?.full_name || user?.email || 'Someone'} wants you to be their student`;

        const fullMessage = customMessage.trim()
          ? `${baseMessage}\n\nMessage: ${customMessage.trim()}`
          : baseMessage;

        await supabase.from('notifications').insert({
          user_id: connection.id,
          type: notificationType,
          title:
            selectedRole === 'student'
              ? 'New Supervisor Invitation'
              : 'New Student Invitation',
          message: fullMessage,
          data: {
            inviterId: user?.id,
            inviterName: profile?.full_name || user?.email,
            inviterRole: selectedRole,
            relationshipType,
            customMessage: customMessage.trim() || undefined,
          },
        });

        successCount++;
      }

      Alert.alert(
        getTranslation('common.success', language === 'sv' ? 'Framgång' : 'Success'),
        getTranslation(
          'connections.requestsSent',
          language === 'sv'
            ? `${successCount} förfrågningar skickade framgångsrikt${failCount > 0 ? `, ${failCount} misslyckades` : ''}`
            : `${successCount} requests sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
        )
      );

      // Reset and close
      setSelectedConnections([]);
      setSearchQuery('');
      setCustomMessage('');
      onClose();
    } catch (err) {
      console.error('Error sending requests:', err);
      Alert.alert(
        getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
        getTranslation(
          'connections.sendFailed',
          language === 'sv'
            ? 'Misslyckades med att skicka förfrågningar'
            : 'Failed to send requests'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const targetRole = selectedRole === 'student' ? 'instructor' : 'student';
  const targetRoleLabel =
    targetRole === 'instructor'
      ? getTranslation('role.instructor', language === 'sv' ? 'Handledare' : 'Instructor')
      : getTranslation('role.student', language === 'sv' ? 'Elev' : 'Student');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <ReanimatedAnimated.View
          style={[
            {
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
            },
            backdropAnimatedStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </ReanimatedAnimated.View>

        <GestureDetector gesture={panGesture}>
          <ReanimatedAnimated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: height * 0.9,
              },
              animatedStyle,
            ]}
          >
            <YStack padding="$4" gap="$4">
              {/* Sheet Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  alignSelf: 'center',
                }}
              />

              {/* Title */}
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {getTranslation(
                  'connections.findTitle',
                  language === 'sv'
                    ? `Hitta ${targetRoleLabel === 'Handledare' ? 'handledare' : 'elever'}`
                    : `Find ${targetRoleLabel}s`
                )}
              </Text>

              {/* Search Input */}
              <XStack
                backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7'}
                borderRadius="$3"
                padding="$3"
                alignItems="center"
                gap="$2"
              >
                <Feather
                  name="search"
                  size={20}
                  color={colorScheme === 'dark' ? '#8E8E93' : '#666'}
                />
                <RNTextInput
                  placeholder={getTranslation(
                    'connections.searchPlaceholder',
                    language === 'sv'
                      ? `Sök efter ${targetRoleLabel.toLowerCase()}...`
                      : `Search for ${targetRoleLabel.toLowerCase()}s...`
                  )}
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#666'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    flex: 1,
                    color: colorScheme === 'dark' ? '#FFF' : '#000',
                    fontSize: 16,
                  }}
                />
                {searching && <Feather name="loader" size={20} color="#00E6C3" />}
              </XStack>

              {/* Search Results */}
              <ScrollView style={{ maxHeight: 300 }}>
                <YStack gap="$2">
                  {searchResults.length === 0 && searchQuery.trim() && !searching && (
                    <Text color="$gray11" textAlign="center" padding="$4">
                      {getTranslation(
                        'connections.noResults',
                        language === 'sv' ? 'Inga resultat hittades' : 'No results found'
                      )}
                    </Text>
                  )}

                  {searchResults.map((result) => {
                    const isSelected = selectedConnections.find((c) => c.id === result.id);
                    return (
                      <TouchableOpacity
                        key={result.id}
                        onPress={() => toggleConnection(result)}
                        style={{
                          backgroundColor: isSelected
                            ? colorScheme === 'dark'
                              ? 'rgba(0, 230, 195, 0.1)'
                              : 'rgba(0, 230, 195, 0.1)'
                            : colorScheme === 'dark'
                              ? '#2C2C2E'
                              : '#F2F2F7',
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: '#00E6C3',
                        }}
                      >
                        <XStack alignItems="center" gap="$3">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: '#00E6C3',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Feather name="user" size={20} color="#000" />
                          </View>
                          <YStack flex={1}>
                            <Text fontSize="$4" fontWeight="600" color="$color">
                              {result.full_name}
                            </Text>
                            <Text fontSize="$3" color="$gray11">
                              {result.email}
                            </Text>
                          </YStack>
                          {isSelected && <Feather name="check-circle" size={24} color="#00E6C3" />}
                        </XStack>
                      </TouchableOpacity>
                    );
                  })}
                </YStack>
              </ScrollView>

              {/* Selected Connections */}
              {selectedConnections.length > 0 && (
                <YStack gap="$2">
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    {getTranslation(
                      'connections.selected',
                      language === 'sv'
                        ? `Valda (${selectedConnections.length})`
                        : `Selected (${selectedConnections.length})`
                    )}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack gap="$2">
                      {selectedConnections.map((connection) => (
                        <View
                          key={connection.id}
                          style={{
                            backgroundColor:
                              colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                            borderRadius: 20,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <XStack alignItems="center" gap="$2">
                            <Text fontSize="$3" color="$color">
                              {connection.full_name}
                            </Text>
                            <TouchableOpacity onPress={() => toggleConnection(connection)}>
                              <Feather name="x" size={16} color="$gray11" />
                            </TouchableOpacity>
                          </XStack>
                        </View>
                      ))}
                    </XStack>
                  </ScrollView>
                </YStack>
              )}

              {/* Custom Message */}
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {getTranslation(
                    'connections.customMessage',
                    language === 'sv'
                      ? 'Valfritt meddelande'
                      : 'Optional Message'
                  )}
                </Text>
                <TextArea
                  placeholder={getTranslation(
                    'connections.messagePlaceholder',
                    language === 'sv'
                      ? 'Lägg till ett personligt meddelande...'
                      : 'Add a personal message...'
                  )}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  maxLength={500}
                  backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7'}
                  borderWidth={0}
                  color="$color"
                />
              </YStack>

              {/* Action Buttons */}
              <XStack gap="$2">
                <Button
                  variant="outline"
                  size="lg"
                  flex={1}
                  onPress={onClose}
                  disabled={loading}
                >
                  {getTranslation('common.cancel', language === 'sv' ? 'Avbryt' : 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  flex={1}
                  onPress={handleSendRequests}
                  disabled={loading || selectedConnections.length === 0}
                >
                  {loading
                    ? getTranslation('common.sending', language === 'sv' ? 'Skickar...' : 'Sending...')
                    : getTranslation(
                        'connections.sendRequests',
                        language === 'sv'
                          ? `Skicka ${selectedConnections.length} förfrågan${selectedConnections.length > 1 ? 'ar' : ''}`
                          : `Send ${selectedConnections.length} Request${selectedConnections.length > 1 ? 's' : ''}`
                      )}
                </Button>
              </XStack>
            </YStack>
          </ReanimatedAnimated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

