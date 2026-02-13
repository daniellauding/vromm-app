import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  useColorScheme,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { YStack, XStack, Text, Card, TextArea } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { RadioButton } from '../../components/SelectButton';
import { FormField } from '../../components/FormField';
import { Button } from '../../components/Button';
import * as Haptics from 'expo-haptics';

const GETTING_STARTED_IMAGES = {
  connections: require('../../../assets/images/getting_started/getting_started_06.png'),
};

const { height } = Dimensions.get('window');

export const ConnectionsCard = () => {
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const { profile, user } = useAuth();
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [hasConnections, setHasConnections] = useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<any[]>([]);
  const [connectionCustomMessage, setConnectionCustomMessage] = useState('');
  const [existingRelationships, setExistingRelationships] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'existing'>('pending');
  const [isCardHidden, setIsCardHidden] = useState(false);

  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  const connectionsSnapPoints = useMemo(
    () => ({
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height,
    }),
    [],
  );

  const connectionsTranslateY = useSharedValue(height);
  const connectionsBackdropOpacityShared = useSharedValue(0);
  const connectionsCurrentState = useSharedValue(connectionsSnapPoints.large);

  const connectionsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: connectionsTranslateY.value }],
  }));

  const connectionsPanGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = connectionsCurrentState.value + translationY;

      // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
      const minPosition = connectionsSnapPoints.large; // Smallest Y (show most)
      const maxPosition = connectionsSnapPoints.mini + 100; // Allow dragging past mini for dismissal
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      connectionsTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const currentPosition = connectionsCurrentState.value + translationY;

      // Dismiss if dragged down past mini with reasonable velocity
      if (currentPosition > connectionsSnapPoints.mini + 30 && velocityY > 200) {
        runOnJS(hideConnectionsSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = connectionsSnapPoints.large;
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = connectionsSnapPoints.mini;
      } else {
        // Find closest snap point
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

      // Constrain target to valid range
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

      connectionsCurrentState.value = boundedTarget;
    });

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
    connectionsCurrentState.value = connectionsSnapPoints.large;
    connectionsBackdropOpacityShared.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
    });
  };

  const hideConnectionsSheet = () => {
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

  const handleSearchUsers = async (query: string) => {
    setConnectionSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      let targetRole = '';
      if (profile?.role === 'student') {
        targetRole = 'instructor';
      } else if (profile?.role === 'instructor') {
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
      let successCount = 0;

      for (const targetUser of selectedConnections) {
        if (!targetUser.email) continue;

        const relationshipType =
          profile?.role === 'student'
            ? 'student_invites_supervisor'
            : 'supervisor_invites_student';
        const targetRole = profile?.role === 'student' ? 'instructor' : 'student';

        const { error: inviteError } = await supabase.from('pending_invitations').insert({
          email: targetUser.email.toLowerCase(),
          role: targetRole,
          invited_by: user.id,
          metadata: {
            supervisorName: profile?.full_name || user.email,
            inviterRole: profile?.role,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: targetUser.id,
            targetUserName: targetUser.full_name,
            customMessage: connectionCustomMessage.trim() || undefined,
          },
          status: 'pending',
        });

        if (inviteError) continue;

        const notificationType =
          profile?.role === 'student' ? 'supervisor_invitation' : 'student_invitation';
        const baseMessage =
          profile?.role === 'student'
            ? `${profile?.full_name || user.email || 'Someone'} wants you to be their supervisor`
            : `${profile?.full_name || user.email || 'Someone'} wants you to be their student`;

        const fullMessage = connectionCustomMessage.trim()
          ? `${baseMessage}\n\nPersonal message: "${connectionCustomMessage.trim()}"`
          : baseMessage;

        await supabase.from('notifications').insert({
          user_id: targetUser.id,
          actor_id: user.id,
          type: notificationType as any,
          title: 'New Supervision Request',
          message: fullMessage,
          metadata: {
            relationship_type: relationshipType,
            from_user_id: user.id,
            from_user_name: profile?.full_name || user.email,
            customMessage: connectionCustomMessage.trim() || undefined,
          },
          action_url: 'vromm://notifications',
          priority: 'high',
          is_read: false,
        });

        successCount++;
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

  const handleRemoveRelationship = async (relationship: any) => {
    if (!relationship || !user?.id) return;

    try {
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .delete()
        .or(
          relationship.relationship_type === 'has_supervisor'
            ? `and(student_id.eq.${user.id},supervisor_id.eq.${relationship.id})`
            : `and(student_id.eq.${relationship.id},supervisor_id.eq.${user.id})`,
        );

      if (error) throw error;
      loadExistingRelationships();
    } catch (error) {
      console.error('Error removing relationship:', error);
    }
  };

  // Check if user has connections
  useEffect(() => {
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

  // Hide card if manually hidden or no role selected
  if (isCardHidden || !profile?.role_confirmed) {
    return null;
  }

  return (
    <>
      <YStack paddingHorizontal="$4">
        <Card
          backgroundColor={hasConnections ? '$green5' : '$backgroundStrong'}
          borderRadius="$4"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderColor"
        >
          {/* Completion badge - absolutely positioned */}
          {hasConnections && (
            <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
                backgroundColor: '#00E6C3',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 3,
                zIndex: 1,
            }}
          >
              <Text fontSize={9} color="#000" fontWeight="bold">
                {getTranslation('home.gettingStarted.status.completed', language === 'sv' ? 'KLART' : 'DONE')}
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

          <YStack alignItems="center" gap="$4" padding="$6">
            <YStack alignItems="center" gap="$2">
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {hasConnections
                  ? profile?.role === 'student'
                    ? existingRelationships.length > 0
                      ? `${existingRelationships.length} ${getTranslation('connections.existing', language === 'sv' ? 'Handledare' : 'Supervisor')}${existingRelationships.length > 1 ? (language === 'sv' ? '' : 's') : ''}`
                      : getTranslation('home.gettingStarted.connectStudent.title', language === 'sv' ? 'Handledare' : 'Supervisor')
                    : existingRelationships.length > 0
                      ? `${existingRelationships.length} ${getTranslation('connections.existing', language === 'sv' ? 'Elever' : 'Student')}${existingRelationships.length > 1 ? (language === 'sv' ? '' : 's') : ''}`
                      : getTranslation('home.gettingStarted.connectInstructor.title', language === 'sv' ? 'Elever' : 'Students')
                  : profile?.role === 'student'
                    ? getTranslation('home.gettingStarted.connectStudent.title', language === 'sv' ? 'Lägg till handledare' : 'Add Supervisor')
                    : getTranslation('home.gettingStarted.connectInstructor.title', language === 'sv' ? 'Lägg till elever' : 'Add Students')}
              </Text>
              <Text fontSize="$4" color="$gray11" textAlign="center">
                {pendingInvitations.length > 0
                  ? `${pendingInvitations.length} ${getTranslation('connections.pending', language === 'sv' ? 'väntande inbjudan' : 'pending invitation')}${pendingInvitations.length > 1 ? (language === 'sv' ? 'ar' : 's') : ''}`
                  : hasConnections
                    ? profile?.role === 'student'
                      ? getTranslation('home.gettingStarted.connectStudent.description', language === 'sv' ? 'Ansluten med handledare' : 'Connected with supervisor')
                      : getTranslation('home.gettingStarted.connectInstructor.description', language === 'sv' ? 'Ansluten med elever' : 'Connected with students')
                    : profile?.role === 'student'
                      ? getTranslation('home.gettingStarted.connectStudent.description', language === 'sv' ? 'Anslut med handledare och instruktörer' : 'Connect with instructors and supervisors')
                      : getTranslation('home.gettingStarted.connectInstructor.description', language === 'sv' ? 'Anslut med elever att handleda' : 'Connect with students to supervise')}
              </Text>
            </YStack>

            <TouchableOpacity
              onPress={showConnectionsSheet}
              style={{
                backgroundColor: '#00E6C3',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Text fontSize="$4" fontWeight="600" color="#000">
                {getTranslation(
                  'home.connections.findUsers',
                  language === 'sv' ? 'Hitta användare' : 'Find Users',
                )}
              </Text>
            </TouchableOpacity>
          </YStack>
        </Card>
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
            <GestureDetector gesture={connectionsPanGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: colorScheme === 'dark' ? '#151515' : '#fff',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                  },
                  connectionsAnimatedStyle,
                ]}
              >
                {/* Drag Handle - outside ScrollView */}
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

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <YStack gap="$4" paddingBottom="$16">

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {profile?.role === 'student'
                    ? getTranslation(
                        'connections.findInstructors',
                        language === 'sv' ? 'Hitta handledare' : 'Find Instructors',
                      )
                    : getTranslation(
                        'connections.findStudents',
                        language === 'sv' ? 'Hitta elever' : 'Find Students',
                      )}
                </Text>

                {/* Tabs for pending/existing */}
                {(existingRelationships.length > 0 || pendingInvitations.length > 0) && (
                  <YStack
                    gap="$3"
                    padding="$4"
                    backgroundColor="$backgroundHover"
                    borderRadius="$4"
                    maxHeight="300"
                  >
                    <XStack gap="$2" marginBottom="$2">
                      <TouchableOpacity
                        onPress={() => setActiveTab('pending')}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor:
                            activeTab === 'pending'
                              ? colorScheme === 'dark'
                                ? '#333'
                                : '#E5E5E5'
                              : 'transparent',
                        }}
                      >
                        <Text
                          size="sm"
                          fontWeight={activeTab === 'pending' ? '600' : '400'}
                          color="$color"
                        >
                          {getTranslation('connections.pending', language === 'sv' ? 'Väntande' : 'Pending')} ({pendingInvitations.length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveTab('existing')}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor:
                            activeTab === 'existing'
                              ? colorScheme === 'dark'
                                ? '#333'
                                : '#E5E5E5'
                              : 'transparent',
                        }}
                      >
                        <Text
                          size="sm"
                          fontWeight={activeTab === 'existing' ? '600' : '400'}
                          color="$color"
                        >
                          {getTranslation('connections.existing', language === 'sv' ? 'Befintliga' : 'Existing')} ({existingRelationships.length})
                        </Text>
                      </TouchableOpacity>
                    </XStack>

                    <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                      <YStack gap="$3">
                        {activeTab === 'pending' ? (
                          pendingInvitations.length > 0 ? (
                            pendingInvitations.map((invitation) => (
                              <XStack key={invitation.id} gap="$2" alignItems="center">
                                <YStack flex={1}>
                                  <Text fontSize="$4" fontWeight="600" color="$color">
                                    {invitation.metadata?.targetUserName || invitation.email}
                                  </Text>
                                  <Text fontSize="$3" color="$gray11">
                                    {invitation.email} • {getTranslation('connections.invitedAs', language === 'sv' ? 'Inbjuden som' : 'Invited as')} {invitation.role} • {new Date(invitation.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US')}
                                  </Text>
                                  {invitation.metadata?.customMessage && (
                                    <Text fontSize="$2" color="$gray9" fontStyle="italic">
                                      {getTranslation('connections.message', language === 'sv' ? 'Meddelande' : 'Message')}: "{invitation.metadata.customMessage}"
                                    </Text>
                                  )}
                                </YStack>
                                <Text fontSize="$3" color="$orange10" fontWeight="600">
                                  {language === 'sv' ? 'VÄNTANDE' : 'PENDING'}
                                </Text>
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    } catch (e) {
                                      // Haptics might not be available
                                    }

                                    try {
                                      // Try to delete the invitation
                                      const { error } = await supabase
                                        .from('pending_invitations')
                                        .delete()
                                        .eq('id', invitation.id);

                                      if (error) {
                                        console.error('Error deleting invitation:', error);
                                      }

                                      // Remove from local state immediately
                                      setPendingInvitations((prev) =>
                                        prev.filter((inv) => inv.id !== invitation.id),
                                      );

                                      // Refresh the list
                                      await loadPendingInvitations();
                                    } catch (error) {
                                      console.error('Error removing invitation:', error);
                                      // Even if there's an error, remove from local state
                                      setPendingInvitations((prev) =>
                                        prev.filter((inv) => inv.id !== invitation.id),
                                      );
                                    }
                                  }}
                                  style={{
                                    padding: 12,
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 8,
                                    marginLeft: 8,
                                  }}
                                  activeOpacity={0.6}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Feather name="trash-2" size={16} color="#EF4444" />
                                </TouchableOpacity>
                              </XStack>
                            ))
                          ) : (
                            <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                              {getTranslation('connections.noPending', language === 'sv' ? 'Inga väntande inbjudningar' : 'No pending invitations')}
                            </Text>
                          )
                        ) : existingRelationships.length > 0 ? (
                          existingRelationships.map((relationship) => (
                            <XStack key={relationship.id} gap="$2" alignItems="center">
                              <YStack flex={1}>
                                <Text fontSize="$4" fontWeight="600" color="$color">
                                  {relationship.name}
                                </Text>
                                <Text fontSize="$3" color="$gray11">
                                  {relationship.email} • {relationship.role} • {relationship.relationship_type === 'has_supervisor' ? getTranslation('connections.yourSupervisor', language === 'sv' ? 'Din handledare' : 'Your supervisor') : getTranslation('connections.studentYouSupervise', language === 'sv' ? 'Elev du handleder' : 'Student you supervise')} {getTranslation('connections.since', language === 'sv' ? 'sedan' : 'since')} {new Date(relationship.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US')}
                                </Text>
                              </YStack>
                              <TouchableOpacity
                                onPress={() => handleRemoveRelationship(relationship)}
                              >
                                <Feather name="trash-2" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </XStack>
                          ))
                        ) : (
                          <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                            {getTranslation('connections.noExisting', language === 'sv' ? 'Inga befintliga relationer' : 'No existing relationships')}
                          </Text>
                        )}
                      </YStack>
                    </ScrollView>
                  </YStack>
                )}

                {/* Selected connections */}
                {selectedConnections.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      {getTranslation('connections.selected', language === 'sv' ? 'Valda' : 'Selected')} ({selectedConnections.length})
                    </Text>
                    {selectedConnections.map((connection) => (
                      <XStack key={connection.id} gap="$2" alignItems="center">
                        <YStack flex={1}>
                          <Text fontSize="$4" fontWeight="600" color="$color">
                            {connection.full_name}
                          </Text>
                        </YStack>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedConnections((prev) =>
                              prev.filter((conn) => conn.id !== connection.id),
                            )
                          }
                        >
                          <Feather name="x" size={16} color="$gray11" />
                        </TouchableOpacity>
                      </XStack>
                    ))}
                  </YStack>
                )}

                {/* Custom message */}
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11">
                    {getTranslation('connections.optionalMessage', language === 'sv' ? 'Valfritt meddelande' : 'Optional message')}
                  </Text>
                  <TextArea
                    value={connectionCustomMessage}
                    onChangeText={setConnectionCustomMessage}
                    placeholder={getTranslation('connections.messagePlaceholder', language === 'sv' ? 'Lägg till ett personligt meddelande...' : 'Add a personal message...')}
                    minHeight={60}
                    backgroundColor="$background"
                    borderColor="$borderColor"
                    color="$color"
                  />
                </YStack>

                {/* Search */}
                <XStack
                  backgroundColor={colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7'}
                  borderRadius="$3"
                  padding="$3"
                  alignItems="center"
                  gap="$2"
                >
                  <Feather name="search" size={20} color={colorScheme === 'dark' ? '#8E8E93' : '#666'} />
                  <RNTextInput
                    placeholder={getTranslation('connections.searchPlaceholder', language === 'sv' ? 'Sök efter användare...' : 'Search for users...')}
                    placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#666'}
                    value={connectionSearchQuery}
                    onChangeText={handleSearchUsers}
                    style={{
                      flex: 1,
                      color: colorScheme === 'dark' ? '#FFF' : '#000',
                      fontSize: 16,
                    }}
                  />
                </XStack>

                {/* Search results */}
                <ScrollView style={{ maxHeight: 300 }}>
                  <YStack gap="$2">
                    {searchResults.map((user) => {
                      const isSelected = selectedConnections.find((c) => c.id === user.id);
                      return (
                        <TouchableOpacity
                          key={user.id}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedConnections((prev) =>
                                prev.filter((c) => c.id !== user.id),
                              );
                            } else {
                              setSelectedConnections((prev) => [...prev, user]);
                            }
                          }}
                          style={{
                            backgroundColor: isSelected
                              ? 'rgba(0, 230, 195, 0.1)'
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
                            <YStack flex={1}>
                              <Text fontSize="$4" fontWeight="600" color="$color">
                                {user.full_name}
                              </Text>
                              <Text fontSize="$3" color="$gray11">
                                {user.email}
                              </Text>
                            </YStack>
                            {isSelected && <Feather name="check-circle" size={24} color="#00E6C3" />}
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                </ScrollView>

                {/* Action buttons */}
                <XStack gap="$2">
                  <Button
                    variant="outline"
                    size="lg"
                    flex={1}
                    onPress={hideConnectionsSheet}
                  >
                    {getTranslation('common.cancel', language === 'sv' ? 'Avbryt' : 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    flex={1}
                    onPress={handleCreateConnections}
                    disabled={selectedConnections.length === 0}
                  >
                    {getTranslation('connections.send', language === 'sv' ? 'Skicka' : 'Send')} ({selectedConnections.length})
                  </Button>
                </XStack>
                  </YStack>
                </ScrollView>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </ReanimatedAnimated.View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
};

