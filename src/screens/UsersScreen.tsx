import React, { useState, useEffect, useCallback } from 'react';
import { Image, TouchableOpacity, useColorScheme, RefreshControl } from 'react-native';
import { XStack, YStack, Card, ScrollView, Button } from 'tamagui';
import { supabase } from '../lib/supabase';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { format } from 'date-fns';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';
import { inviteNewUser } from '../services/invitationService';
import { relLog } from '../utils/relationshipDebug';

type User = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string | null;
  location?: string;
  created_at: string;
  role?: string;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
  isInstructor?: boolean;
  isStudent?: boolean;
  pendingInvited?: boolean; // optimistic UI flag
};

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const [relationshipLoading, setRelationshipLoading] = useState<{ [key: string]: boolean }>({});
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { user, profile: currentUserProfile } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          avatar_url,
          email,
          location,
          created_at,
          role
        `,
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let usersWithFollowStatus = data || [];

      // If user is authenticated, check follow status and relationships for each user
      if (user?.id) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(followData?.map((f) => f.following_id) || []);
        
        // Check instructor relationships (users that are instructors for current user)
        const { data: instructorData } = await supabase
          .from('student_supervisor_relationships')
          .select('supervisor_id')
          .eq('student_id', user.id);
        
        const instructorIds = new Set(instructorData?.map((r) => r.supervisor_id) || []);
        
        // Check student relationships (users that are students of current user)
        const { data: studentData } = await supabase
          .from('student_supervisor_relationships')
          .select('student_id')
          .eq('supervisor_id', user.id);
        
        const studentIds = new Set(studentData?.map((r) => r.student_id) || []);

        usersWithFollowStatus = (data || []).map((userData) => ({
          ...userData,
          isFollowing: followingIds.has(userData.id),
          isCurrentUser: userData.id === user.id,
          isInstructor: instructorIds.has(userData.id),
          isStudent: studentIds.has(userData.id),
        }));
      }

      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const navigateToProfile = (userId: string) => {
    navigation.navigate('PublicProfile', { userId });
  };

  const handleInstructorToggle = async (targetUserId: string, isCurrentlyInstructor: boolean) => {
    if (!user?.id || relationshipLoading[targetUserId]) return;
    
    console.log('🎓 INSTRUCTOR TOGGLE (UsersScreen) - Starting');
    console.log('🎓 Current user ID:', user.id);
    console.log('🎓 Target user ID:', targetUserId);
    console.log('🎓 Current isInstructor state:', isCurrentlyInstructor);
    console.log('🎓 Action:', isCurrentlyInstructor ? 'UNSET as instructor' : 'SET as instructor');
    
    try {
      setRelationshipLoading((prev) => ({ ...prev, [targetUserId]: true }));
      
      if (isCurrentlyInstructor) {
        // Remove instructor relationship
        console.log('🎓 REMOVING instructor relationship...');
        const { error } = await supabase
          .from('student_supervisor_relationships')
          .delete()
          .eq('student_id', user.id)
          .eq('supervisor_id', targetUserId);
        
        if (error) throw error;
        
        console.log('✅ INSTRUCTOR REMOVED successfully');
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isInstructor: false } : u))
        );
        Alert.alert('Success', 'Removed as your instructor');
      } else {
        // Send invitation to instructor instead of creating relationship
        console.log('🎓 SENDING INSTRUCTOR INVITATION...');
        const target = users.find((u) => u.id === targetUserId);
        if (!target?.email) throw new Error('Target user has no email, cannot invite');
        relLog.inviteStart(user.id, targetUserId, 'student_invites_supervisor');
        // Optional custom message prompt
        let customMessage: string | undefined;
        try {
          // @ts-ignore - simple prompt for RN
          customMessage = await new Promise<string | undefined>((resolve) => {
            Alert.prompt(
              'Add a personal message (optional)',
              'This will be shown in the invitation modal and notification.',
              [
                { text: 'Skip', style: 'cancel', onPress: () => resolve(undefined) },
                { text: 'Send', onPress: (text) => resolve(text?.trim() || undefined) },
              ],
              'plain-text',
            );
          });
        } catch {}

        const result = await inviteNewUser({
          email: target.email,
          role: 'instructor',
          supervisorId: user.id,
          supervisorName: currentUserProfile?.full_name || undefined,
          inviterRole: currentUserProfile?.role as any,
          relationshipType: 'student_invites_supervisor',
          metadata: customMessage ? { customMessage } : undefined,
        });
        if (!result.success) throw new Error(result.error || 'Failed to send invitation');
        Alert.alert('Invitation Sent', 'They will appear once they accept.');
        relLog.inviteSuccess(result.invitationId);
        setUsers((prev) => prev.map((u) => (
          u.id === targetUserId ? { ...u, pendingInvited: true } as any : u
        )));
      }
    } catch (error) {
      console.error('❌ ERROR toggling instructor:', error);
      Alert.alert('Error', 'Failed to update instructor status');
    } finally {
      setRelationshipLoading((prev) => ({ ...prev, [targetUserId]: false }));
      console.log('🎓 INSTRUCTOR TOGGLE (UsersScreen) - Complete');
    }
  };
  
  const handleStudentToggle = async (targetUserId: string, isCurrentlyStudent: boolean) => {
    if (!user?.id || relationshipLoading[targetUserId]) return;
    
    console.log('👨‍🎓 STUDENT TOGGLE (UsersScreen) - Starting');
    console.log('👨‍🎓 Current user ID:', user.id);
    console.log('👨‍🎓 Target user ID:', targetUserId);
    console.log('👨‍🎓 Current isStudent state:', isCurrentlyStudent);
    console.log('👨‍🎓 Action:', isCurrentlyStudent ? 'UNSET as student' : 'SET as student');
    
    try {
      setRelationshipLoading((prev) => ({ ...prev, [targetUserId]: true }));
      
      if (isCurrentlyStudent) {
        // Remove student relationship with notification
        console.log('👨‍🎓 REMOVING student relationship...');
        
        const { removeSupervisorRelationship } = await import('../services/invitationService');
        const success = await removeSupervisorRelationship(
          targetUserId, // studentId
          user.id, // supervisorId
          undefined, // no message for now
          user.id // removedByUserId
        );
        
        if (!success) throw new Error('Failed to remove relationship');
        
        console.log('✅ STUDENT REMOVED successfully');
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isStudent: false } : u))
        );
        Alert.alert('Success', 'Removed as your student');
      } else {
        // Send invitation to student instead of creating relationship
        console.log('👨‍🎓 SENDING STUDENT INVITATION...');
        const target = users.find((u) => u.id === targetUserId);
        if (!target?.email) throw new Error('Target user has no email, cannot invite');
        relLog.inviteStart(user.id, targetUserId, 'supervisor_invites_student');
        // Optional custom message prompt
        let customMessage: string | undefined;
        try {
          // @ts-ignore - simple prompt for RN
          customMessage = await new Promise<string | undefined>((resolve) => {
            Alert.prompt(
              'Add a personal message (optional)',
              'This will be shown in the invitation modal and notification.',
              [
                { text: 'Skip', style: 'cancel', onPress: () => resolve(undefined) },
                { text: 'Send', onPress: (text) => resolve(text?.trim() || undefined) },
              ],
              'plain-text',
            );
          });
        } catch {}

        const result = await inviteNewUser({
          email: target.email,
          role: 'student',
          supervisorId: user.id,
          supervisorName: currentUserProfile?.full_name || undefined,
          inviterRole: currentUserProfile?.role as any,
          relationshipType: 'supervisor_invites_student',
          metadata: customMessage ? { customMessage } : undefined,
        });
        if (!result.success) throw new Error(result.error || 'Failed to send invitation');
        Alert.alert('Invitation Sent', 'They will appear once they accept.');
        relLog.inviteSuccess(result.invitationId);
        setUsers((prev) => prev.map((u) => (
          u.id === targetUserId ? { ...u, pendingInvited: true } as any : u
        )));
      }
    } catch (error) {
      console.error('❌ ERROR toggling student:', error);
      Alert.alert('Error', 'Failed to update student status');
    } finally {
      setRelationshipLoading((prev) => ({ ...prev, [targetUserId]: false }));
      console.log('👨‍🎓 STUDENT TOGGLE (UsersScreen) - Complete');
    }
  };

  const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      if (!user?.id || followLoading[targetUserId]) return;

      setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }));

      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: false } : u)),
        );
        console.log('👤 User unfollowed');
      } else {
        // Follow
        const { error } = await supabase.from('user_follows').insert([
          {
            follower_id: user.id,
            following_id: targetUserId,
          },
        ]);

        if (error) throw error;

        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: true } : u)),
        );
        console.log('👤 User followed');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderUserItem = (user: User) => {
    return (
      <Card
        key={user.id}
        marginBottom="$3"
        padding="$4"
        bordered
        pressStyle={{ scale: 0.98 }}
        onPress={() => navigateToProfile(user.id)}
      >
        <XStack gap="$3" alignItems="center">
          {/* Avatar */}
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#444',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="user" size={30} color="#ddd" />
            </View>
          )}

          {/* User Info */}
          <YStack flex={1} gap="$1">
            <Text fontWeight="bold" fontSize="$5">
              {user.full_name || 'Unnamed User'}
            </Text>

            {user.location && (
              <XStack alignItems="center" gap="$1">
                <Feather name="map-pin" size={14} color={iconColor} />
                <Text color="$gray11" fontSize="$3">
                  {user.location}
                </Text>
              </XStack>
            )}

            <XStack gap="$4">
              <XStack alignItems="center" gap="$1">
                <Feather name="clock" size={14} color={iconColor} />
                <Text color="$gray11" fontSize="$3">
                  Joined: {formatDate(user.created_at)}
                </Text>
              </XStack>
            </XStack>
          </YStack>

          {/* Actions Column */}
          <YStack alignItems="flex-end" gap="$2">
            {/* Role badge */}
            {user.role && (
              <Card
                backgroundColor={
                  user.role === 'student'
                    ? '$blue5'
                    : user.role === 'instructor'
                      ? '$green5'
                      : '$purple5'
                }
                padding="$2"
                borderRadius="$4"
              >
                <Text
                  color={
                    user.role === 'student'
                      ? '$blue11'
                      : user.role === 'instructor'
                        ? '$green11'
                        : '$purple11'
                  }
                  fontWeight="500"
                  fontSize="$2"
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </Card>
            )}

            {/* Invited badge (optimistic) */}
            {user.pendingInvited && (
              <Card padding="$1" backgroundColor="$orange5" borderRadius="$4">
                <XStack alignItems="center" gap="$1">
                  <Feather name="clock" size={12} color="#7C2D12" />
                  <Text color="#7C2D12" fontSize="$2">Invited</Text>
                </XStack>
              </Card>
            )}

            {/* Action Buttons */}
            {!user.isCurrentUser && (
              <XStack gap="$2" flexWrap="wrap" justifyContent="flex-end">
                {/* Follow/Unfollow Button */}
                <Button
                  size="sm"
                  variant={user.isFollowing ? 'secondary' : 'primary'}
                  backgroundColor={user.isFollowing ? '$red5' : '$blue10'}
                  onPress={() => handleFollow(user.id, user.isFollowing || false)}
                  disabled={followLoading[user.id]}
                  minWidth={80}
                >
                  <XStack gap="$1" alignItems="center">
                    {followLoading[user.id] ? (
                      <Text color={user.isFollowing ? '$red11' : 'white'} fontSize="$2">
                        ...
                      </Text>
                    ) : (
                      <>
                        <Feather
                          name={user.isFollowing ? 'user-minus' : 'user-plus'}
                          size={12}
                          color={user.isFollowing ? '#EF4444' : 'white'}
                        />
                        <Text
                          color={user.isFollowing ? '$red11' : 'white'}
                          fontSize="$2"
                          fontWeight="500"
                      >
                        {user.isFollowing ? 'Unfollow' : 'Follow'}
                      </Text>
                    </>
                  )}
                </XStack>
              </Button>
              
              {/* Instructor/Student Relationship Buttons */}
              {currentUserProfile && (
                <>
                  {/* Set as Instructor button for instructor/admin/school users viewing student profiles */}
                  {['instructor', 'admin', 'school'].includes(currentUserProfile.role) && 
                   user.role === 'student' && (
                    <Button
                      size="sm"
                      variant={user.isStudent ? 'secondary' : 'primary'}
                      backgroundColor={user.isStudent ? '$orange5' : '$green10'}
                      onPress={() => handleStudentToggle(user.id, user.isStudent || false)}
                      disabled={relationshipLoading[user.id]}
                      minWidth={80}
                    >
                      <XStack gap="$1" alignItems="center">
                        {relationshipLoading[user.id] ? (
                          <Text color={user.isStudent ? '$orange11' : 'white'} fontSize="$2">
                            ...
                          </Text>
                        ) : (
                          <>
                            <Feather
                              name={user.isStudent ? 'user-x' : 'user-check'}
                              size={12}
                              color={user.isStudent ? '#F97316' : 'white'}
                            />
                            <Text
                              color={user.isStudent ? '$orange11' : 'white'}
                              fontSize="$2"
                              fontWeight="500"
                            >
                              {user.isStudent ? 'Unset Student' : 'Set Student'}
                            </Text>
                          </>
                        )}
                      </XStack>
                    </Button>
                  )}
                  
                  {/* Set as Instructor button for student users viewing instructor profiles */}
                  {currentUserProfile.role === 'student' && 
                   ['instructor', 'admin', 'school'].includes(user.role || '') && (
                    <Button
                      size="sm"
                      variant={user.isInstructor ? 'secondary' : 'primary'}
                      backgroundColor={user.isInstructor ? '$purple5' : '$blue10'}
                      onPress={() => handleInstructorToggle(user.id, user.isInstructor || false)}
                      disabled={relationshipLoading[user.id]}
                      minWidth={80}
                    >
                      <XStack gap="$1" alignItems="center">
                        {relationshipLoading[user.id] ? (
                          <Text color={user.isInstructor ? '$purple11' : 'white'} fontSize="$2">
                            ...
                          </Text>
                        ) : (
                          <>
                            <Feather
                              name={user.isInstructor ? 'user-x' : 'user-check'}
                              size={12}
                              color={user.isInstructor ? '#A855F7' : 'white'}
                            />
                            <Text
                              color={user.isInstructor ? '$purple11' : 'white'}
                              fontSize="$2"
                              fontWeight="500"
                            >
                              {user.isInstructor ? 'Unset Instructor' : 'Set Instructor'}
                            </Text>
                          </>
                        )}
                      </XStack>
                    </Button>
                  )}
                </>
              )}
              </XStack>
            )}
          </YStack>
        </XStack>
      </Card>
    );
  };

  return (
    <Screen>
      <YStack f={1}>
        <Header title="Users" showBack />

        <ScrollView
          padding="$4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading && !refreshing ? (
            <YStack padding="$4" alignItems="center">
              <Text>Loading users...</Text>
            </YStack>
          ) : users.length > 0 ? (
            <YStack>{users.map(renderUserItem)}</YStack>
          ) : (
            <YStack padding="$4" alignItems="center">
              <Text>No users found</Text>
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </Screen>
  );
}
