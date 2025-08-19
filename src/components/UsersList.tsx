import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { XStack, YStack, ScrollView, View, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { inviteNewUser } from '../services/invitationService';
import { useNavigation } from '@react-navigation/native';
import { relLog } from '../utils/relationshipDebug';
import { NavigationProp } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

type User = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  email?: string | null;
  location?: string;
  created_at?: string;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
  invited?: boolean;
};

function UserItem({
  user,
  currentUser,
  currentUserRole,
}: {
  user: User;
  currentUser: User | null;
  currentUserRole: string | null;
}) {
  const navigation = useNavigation<NavigationProp>();
  const [isInvited, setIsInvited] = useState(user.invited);
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const navigateToProfile = React.useCallback(() => {
    navigation.navigate('PublicProfile', { userId: user.id });
  }, [navigation, user.id]);

  const handleInvite = React.useCallback(async () => {
    if (!currentUser?.id) return;
    if (!user.email) {
      Alert.alert('Invite', 'This user has no email on file. Cannot send invitation.');
      return;
    }

    const isStudentInvitingSupervisor = currentUserRole === 'student';
    const relationshipText = isStudentInvitingSupervisor ? 'supervisor' : 'student';

    Alert.alert(
      'Send Invitation',
      `Invite ${user.full_name || 'this user'} to be your ${relationshipText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              relLog.inviteStart(
                currentUser.id,
                user.id,
                isStudentInvitingSupervisor
                  ? 'student_invites_supervisor'
                  : 'supervisor_invites_student',
              );
              // Optional personal message
              let customMessage: string | undefined;
              try {
                // @ts-ignore Alert.prompt exists in RN
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
                email: user.email!,
                role: isStudentInvitingSupervisor ? 'instructor' : 'student',
                supervisorId: isStudentInvitingSupervisor ? currentUser.id : currentUser.id,
                supervisorName: undefined,
                relationshipType: isStudentInvitingSupervisor
                  ? 'student_invites_supervisor'
                  : 'supervisor_invites_student',
                metadata: customMessage ? { customMessage } : undefined,
              });
              if (!result.success) throw new Error(result.error || 'Failed to send');
              Alert.alert('Invitation Sent', 'The invitation has been sent.');
              relLog.inviteSuccess(result.invitationId);
              // Optimistic UI: mark as invited (disabled button)
              setIsInvited(true);
            } catch (e) {
              relLog.inviteError(e instanceof Error ? e.message : 'unknown error');
              Alert.alert('Error', 'Failed to send invitation.');
            }
          },
        },
      ],
    );
  }, [currentUser.id, currentUserRole, user.id, user.email, user.full_name]);

  const handleFollow = React.useCallback(async () => {
    try {
      if (!currentUser?.id || isFollowLoading) return;

      setIsFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', user.id);

        if (error) throw error;

        setIsFollowing(false);
        console.log('👤 User unfollowed');
      } else {
        // Follow
        const { error } = await supabase.from('user_follows').insert([
          {
            follower_id: currentUser.id,
            following_id: user.id,
          },
        ]);

        if (error) throw error;

        setIsFollowing(true);
        console.log('👤 User followed');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsFollowLoading(false);
    }
  }, [currentUser.id, user.id, isFollowing, isFollowLoading]);

  return (
    <TouchableOpacity
      key={user.id}
      onPress={navigateToProfile}
      onLongPress={handleInvite}
      activeOpacity={0.8}
    >
      <YStack
        width={130}
        borderRadius={16}
        backgroundColor="$backgroundStrong"
        padding="$3"
        alignItems="center"
        gap="$2"
        borderWidth={1}
        borderColor="$borderColor"
      >
        {/* Avatar */}
        {user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={{ width: 70, height: 70, borderRadius: 35 }}
          />
        ) : (
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: colorScheme === 'dark' ? '#444' : '#eee',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="user" size={30} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
          </View>
        )}

        {/* Name */}
        <Text
          textAlign="center"
          fontWeight="bold"
          fontSize="$3"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {user.full_name || 'Unknown'}
        </Text>

        {/* Role badge */}
        {user.role && (
          <View
            style={{
              backgroundColor:
                user.role === 'student'
                  ? '#4B6BFF33'
                  : user.role === 'instructor'
                    ? '#34C75933'
                    : '#AF52DE33',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text
              fontSize="$2"
              color={
                user.role === 'student'
                  ? '#4B6BFF'
                  : user.role === 'instructor'
                    ? '#34C759'
                    : '#AF52DE'
              }
              fontWeight="bold"
            >
              {user.role.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Location (if available) */}
        {user.location && (
          <XStack alignItems="center" gap="$1">
            <Feather name="map-pin" size={10} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
            <Text fontSize="$2" color="$gray11" numberOfLines={1} ellipsizeMode="tail">
              {user.location}
            </Text>
          </XStack>
        )}

        {/* Follow/Unfollow or Invited indicator */}
        {!user.isCurrentUser && (
          <Button
            size="xs"
            variant={isInvited ? 'secondary' : isFollowing ? 'secondary' : 'primary'}
            backgroundColor={isInvited ? '$gray7' : isFollowing ? '$red5' : '$blue10'}
            onPress={handleFollow}
            disabled={isFollowLoading || isInvited}
            marginTop="$2"
            width="100%"
          >
            {isFollowLoading ? (
              <Text color={isFollowing ? '$red11' : 'white'} fontSize="$1">
                ...
              </Text>
            ) : (
              <XStack gap="$1" alignItems="center">
                {isInvited ? (
                  <>
                    <Feather name="clock" size={10} color="#F59E0B" />
                    <Text color="#F59E0B" fontSize="$1" fontWeight="500">
                      Invited
                    </Text>
                  </>
                ) : (
                  <>
                    <Feather
                      name={isFollowing ? 'user-minus' : 'user-plus'}
                      size={10}
                      color={isFollowing ? '#EF4444' : 'white'}
                    />
                    <Text color={isFollowing ? '$red11' : 'white'} fontSize="$1" fontWeight="500">
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Text>
                  </>
                )}
              </XStack>
            )}
          </Button>
        )}
      </YStack>
    </TouchableOpacity>
  );
}

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, location, created_at, email')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        let usersWithFollowStatus = data || [];

        // If user is authenticated, check follow status for each user
        if (currentUser?.id) {
          // Load current user's role for invitation logic
          const { data: me } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
          setCurrentUserRole(me?.role || null);

          const { data: followData } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);

          const followingIds = new Set(followData?.map((f) => f.following_id) || []);

          usersWithFollowStatus = (data || []).map((userData) => ({
            ...userData,
            isFollowing: followingIds.has(userData.id),
            isCurrentUser: userData.id === currentUser.id,
          }));
        }

        setUsers(usersWithFollowStatus);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser?.id]);

  if (loading) {
    return (
      <XStack padding="$4" justifyContent="center">
        <Text>Loading users...</Text>
      </XStack>
    );
  }

  if (users.length === 0) {
    return (
      <XStack padding="$4" justifyContent="center">
        <Text>No users found</Text>
      </XStack>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack space="$4" paddingHorizontal="$4">
        {users.map((user) => (
          <UserItem
            key={user.id}
            user={user}
            currentUser={currentUser}
            currentUserRole={currentUserRole}
          />
        ))}
      </XStack>
    </ScrollView>
  );
}
