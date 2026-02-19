import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  useColorScheme,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { supabase } from '../../lib/supabase';
import { RadioButton } from '../../components/SelectButton';
import { FormField } from '../../components/FormField';
import { Button } from '../../components/Button';

const GETTING_STARTED_IMAGES = {
  connections: require('../../../assets/images/getting_started/getting_started_06.png'),
};

const { height } = Dimensions.get('window');

interface ConnectionSelectionCardProps {
  selectedRole?: 'student' | 'instructor' | null;
}

export const ConnectionSelectionCard = ({ selectedRole }: ConnectionSelectionCardProps) => {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<
    Array<{ id: string; full_name: string; email: string; role?: string }>
  >([]);
  const [connectionCustomMessage, setConnectionCustomMessage] = useState('');
  const [hasConnections, setHasConnections] = useState(false);
  const [existingRelationships, setExistingRelationships] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [activeRelationshipsTab, setActiveRelationshipsTab] = useState<'pending' | 'existing'>(
    'pending',
  );

  const backgroundColor = colorScheme === 'dark' ? '#151515' : '#fff';

  const connectionsTranslateY = useSharedValue(height);
  const connectionsBackdropOpacityShared = useSharedValue(0);

  const connectionsSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.1,
      medium: height * 0.4,
      small: height * 0.7,
      mini: height * 0.85,
      dismissed: height,
    };
    return points;
  }, []);

  const [currentConnectionsSnapPoint, setCurrentConnectionsSnapPoint] = useState(
    connectionsSnapPoints.large,
  );
  const currentConnectionsState = useSharedValue(connectionsSnapPoints.large);

  const connectionsAnimatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { top: connectionsTranslateY.value };
    }
    return {
      transform: [{ translateY: connectionsTranslateY.value }],
    };
  });

  const connectionsPanGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onBegin(() => {})
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentConnectionsState.value + translationY;

        const minPosition = connectionsSnapPoints.large;
        const maxPosition = connectionsSnapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        connectionsTranslateY.value = boundedPosition;
      } catch (error) {
        console.log('connectionsPanGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;

      const currentPosition = currentConnectionsState.value + translationY;

      if (currentPosition > connectionsSnapPoints.mini + 30 && velocityY > 200) {
        runOnJS(hideConnectionsSheet)();
        return;
      }

      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = connectionsSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = connectionsSnapPoints.mini;
      } else {
        const positions = [
          connectionsSnapPoints.large,
          connectionsSnapPoints.medium,
          connectionsSnapPoints.small,
          connectionsSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, connectionsSnapPoints.large),
        connectionsSnapPoints.mini,
      );

      connectionsTranslateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentConnectionsState.value = boundedTarget;
      runOnJS(setCurrentConnectionsSnapPoint)(boundedTarget);
    });

  const typedProfile = profile as typeof profile & {
    role_confirmed?: boolean;
  };

  const hasRoleSelected = typedProfile?.role_confirmed === true;

  // Check if user has connections
  React.useEffect(() => {
    const checkConnections = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('student_supervisor_relationships')
          .select('id', { count: 'exact', head: true })
          .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

        if (!error && typeof count === 'number') {
          setHasConnections(count > 0);
        } else {
          setHasConnections(false);
        }
      } catch (err) {
        setHasConnections(false);
      }
    };

    checkConnections();
  }, [user]);

  const loadExistingRelationships = async () => {
    if (!user?.id) return;

    try {
      const { data: relationships, error } = await supabase
        .from('student_supervisor_relationships')
        .select(
          `
          student_id,
          supervisor_id,
          created_at,
          student:profiles!ssr_student_id_fkey (id, full_name, email, role),
          supervisor:profiles!ssr_supervisor_id_fkey (id, full_name, email, role)
        `,
        )
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading relationships:', error);
        return;
      }

      const transformedRelationships =
        relationships?.map((rel) => {
          const isUserStudent = rel.student_id === user.id;
          const otherUser = isUserStudent ? (rel as any).supervisor : (rel as any).student;

          return {
            id: otherUser?.id || '',
            name: otherUser?.full_name || 'Unknown User',
            email: otherUser?.email || '',
            role: otherUser?.role || '',
            relationship_type: isUserStudent ? 'has_supervisor' : 'supervises_student',
            created_at: rel.created_at,
          };
        }) || [];

      setExistingRelationships(transformedRelationships);
    } catch (error) {
      console.error('Error loading existing relationships:', error);
    }
  };

  const loadPendingInvitations = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('invited_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending invitations:', error);
        return;
      }

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const showConnectionsSheet = () => {
    loadExistingRelationships();
    loadPendingInvitations();

    setShowConnectionsModal(true);
    connectionsTranslateY.value = withSpring(connectionsSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    currentConnectionsState.value = connectionsSnapPoints.large;
    setCurrentConnectionsSnapPoint(connectionsSnapPoints.large);
    connectionsBackdropOpacityShared.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
    });
  };

  function hideConnectionsSheet() {
    connectionsTranslateY.value = withSpring(connectionsSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    connectionsBackdropOpacityShared.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    setTimeout(() => {
      setShowConnectionsModal(false);
    }, 300);
  };

  const handleSearchUsers = async (query: string) => {
    setConnectionSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      let targetRole = '';
      const userRole = selectedRole || profile?.role;
      if (userRole === 'student') {
        targetRole = 'instructor';
      } else if (userRole === 'instructor') {
        targetRole = 'student';
      }

      let query_builder = supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (targetRole) {
        query_builder = query_builder.eq('role', targetRole);
      }

      const { data, error } = await query_builder;

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleCreateConnections = async () => {
    if (!user?.id || selectedConnections.length === 0) return;

    try {
      for (const targetUser of selectedConnections) {
        if (!targetUser.email) continue;

        const userRole = selectedRole || profile?.role;
        const relationshipType =
          userRole === 'student' ? 'student_invites_supervisor' : 'supervisor_invites_student';
        const targetRole = userRole === 'student' ? 'instructor' : 'student';

        await supabase.from('pending_invitations').insert({
          email: targetUser.email.toLowerCase(),
          role: targetRole,
          invited_by: user.id,
          metadata: {
            supervisorName: profile?.full_name || user.email,
            inviterRole: userRole,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: targetUser.id,
            targetUserName: targetUser.full_name,
            customMessage: connectionCustomMessage.trim() || undefined,
          },
          status: 'pending',
        });
      }

      await loadPendingInvitations();
      setSelectedConnections([]);
      setConnectionCustomMessage('');
      setConnectionSearchQuery('');
      setSearchResults([]);
      hideConnectionsSheet();
    } catch (error) {
      console.error('Error creating connections:', error);
    }
  };

  // Only show if role is selected
  if (!hasRoleSelected) {
    return null;
  }

  return (
    <>
      <YStack paddingHorizontal="$4" paddingVertical="$2">
        <TouchableOpacity
          onPress={showConnectionsSheet}
          activeOpacity={0.8}
          style={{ width: '100%' }}
        >
          <Card
            backgroundColor={hasConnections ? '$green5' : '$backgroundStrong'}
            borderRadius="$4"
            overflow="hidden"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <View style={{ position: 'relative' }}>
              {/* Badge */}
              {hasConnections && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={10} color="#000" fontWeight="bold">
                    DONE
                  </Text>
                </View>
              )}

              <Image
                source={GETTING_STARTED_IMAGES.connections}
                style={{
                  width: '100%',
                  height: 140,
                  resizeMode: 'cover',
                }}
              />
            </View>

            <YStack padding="$4" gap="$2">
              <Text fontSize="$5" fontWeight="bold" color="$color">
                {typedProfile?.role === 'student'
                  ? t('home.gettingStarted.connectStudent.title') || 'Add Supervisor'
                  : t('home.gettingStarted.connectInstructor.title') || 'Add Students'}
              </Text>
              <Text fontSize="$3" color="$gray11">
                {typedProfile?.role === 'student'
                  ? t('home.gettingStarted.connectStudent.description') ||
                    'Connect with instructors and supervisors'
                  : t('home.gettingStarted.connectInstructor.description') ||
                    'Connect with students to supervise'}
              </Text>
            </YStack>
          </Card>
        </TouchableOpacity>
      </YStack>

      {/* Connections Modal */}
      <Modal
        visible={showConnectionsModal}
        transparent
        animationType="none"
        onRequestClose={hideConnectionsSheet}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
        <ReanimatedAnimated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: connectionsBackdropOpacityShared,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={hideConnectionsSheet} />
            <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                connectionsAnimatedStyle,
              ]}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
                maxHeight="95%"
              >
                {/* Drag Handle */}
                <GestureDetector gesture={connectionsPanGesture}>
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                      }}
                    />
                  </View>
                </GestureDetector>

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {selectedRole === 'student' || profile?.role === 'student'
                    ? 'Find Instructors'
                    : 'Find Students'}
                </Text>

                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {selectedRole === 'student' || profile?.role === 'student'
                    ? 'Search for driving instructors to connect with'
                    : 'Search for students to connect with'}
                </Text>

                {/* Custom message input */}
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11">
                    Optional message:
                  </Text>
                  <TextInput
                    value={connectionCustomMessage}
                    onChangeText={setConnectionCustomMessage}
                    placeholder="Add a personal message..."
                    multiline
                    style={{
                      backgroundColor: '$background',
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                      borderColor:
                        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 60,
                      textAlignVertical: 'top',
                    }}
                    placeholderTextColor={
                      colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                    }
                  />
                </YStack>

                <FormField
                  placeholder="Search by name or email..."
                  value={connectionSearchQuery}
                  onChangeText={handleSearchUsers}
                />

                <ScrollView style={{ flex: 1, maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                  <YStack gap="$2">
                    {searchResults.length === 0 && connectionSearchQuery.length >= 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        No users found
                      </Text>
                    )}

                    {searchResults.length === 0 && connectionSearchQuery.length < 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        Start typing to search for users
                      </Text>
                    )}

                    {searchResults.map((user) => {
                      const isSelected = selectedConnections.some((conn) => conn.id === user.id);
                      return (
                        <TouchableOpacity
                          key={user.id}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedConnections((prev) =>
                                prev.filter((conn) => conn.id !== user.id),
                              );
                            } else {
                              setSelectedConnections((prev) => [...prev, user]);
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

                {/* Action Buttons */}
                <YStack gap="$2" marginTop="$4">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleCreateConnections}
                    disabled={selectedConnections.length === 0}
                  >
                    <Text color="white" fontWeight="600">
                      {selectedConnections.length > 0
                        ? `Send ${selectedConnections.length} Invitation${selectedConnections.length > 1 ? 's' : ''}`
                        : 'Select Users to Invite'}
                    </Text>
                  </Button>

                  <Button variant="outlined" size="lg" onPress={hideConnectionsSheet}>
                    <Text color="$color">Cancel</Text>
                  </Button>
                </YStack>
              </YStack>
            </ReanimatedAnimated.View>
          </View>
        </ReanimatedAnimated.View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
};

