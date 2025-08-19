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
};

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
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
        if (user?.id) {
          // Load current user's role for invitation logic
          const { data: me } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          setCurrentUserRole(me?.role || null);

          const { data: followData } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id);

          const followingIds = new Set(followData?.map((f) => f.following_id) || []);

          usersWithFollowStatus = (data || []).map((userData) => ({
            ...userData,
            isFollowing: followingIds.has(userData.id),
            isCurrentUser: userData.id === user.id,
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
  }, [user?.id]);

  const handleInvite = async (target: User) => {
    if (!user?.id) return;
    if (!target.email) {
      Alert.alert('Invite', 'This user has no email on file. Cannot send invitation.');
      return;
    }

    const isStudentInvitingSupervisor = currentUserRole === 'student';
    const relationshipText = isStudentInvitingSupervisor ? 'supervisor' : 'student';

    Alert.alert(
      'Send Invitation',
      `Invite ${target.full_name || 'this user'} to be your ${relationshipText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              relLog.inviteStart(user.id, target.id, isStudentInvitingSupervisor ? 'student_invites_supervisor' : 'supervisor_invites_student');
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
                email: target.email!,
                role: isStudentInvitingSupervisor ? 'instructor' : 'student',
                supervisorId: isStudentInvitingSupervisor ? user.id : user.id,
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
              setUsers((prev) => prev.map((u) => (
                u.id === target.id ? { ...u, invited: true } as any : u
              )));
            } catch (e) {
              relLog.inviteError(e instanceof Error ? e.message : 'unknown error');
              Alert.alert('Error', 'Failed to send invitation.');
            }
          },
        },
      ],
    );
  };

  const navigateToProfile = (userId: string) => {
    navigation.navigate('PublicProfile', { userId });
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
          <TouchableOpacity
            key={user.id}
            onPress={() => navigateToProfile(user.id)}
            onLongPress={() => handleInvite(user)}
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
                  <Feather
                    name="map-pin"
                    size={10}
                    color={colorScheme === 'dark' ? '#ddd' : '#666'}
                  />
                  <Text fontSize="$2" color="$gray11" numberOfLines={1} ellipsizeMode="tail">
                    {user.location}
                  </Text>
                </XStack>
              )}

              {/* Follow/Unfollow or Invited indicator */}
              {!user.isCurrentUser && (
                <Button
                  size="xs"
                  variant={(user as any).invited ? 'secondary' : user.isFollowing ? 'secondary' : 'primary'}
                  backgroundColor={(user as any).invited ? '$gray7' : user.isFollowing ? '$red5' : '$blue10'}
                  onPress={() => handleFollow(user.id, user.isFollowing || false)}
                  disabled={followLoading[user.id] || (user as any).invited}
                  marginTop="$2"
                  width="100%"
                >
                  {followLoading[user.id] ? (
                    <Text color={user.isFollowing ? '$red11' : 'white'} fontSize="$1">
                      ...
                    </Text>
                  ) : (
                    <XStack gap="$1" alignItems="center">
                      {(user as any).invited ? (
                        <>
                          <Feather name="clock" size={10} color="#F59E0B" />
                          <Text color="#F59E0B" fontSize="$1" fontWeight="500">Invited</Text>
                        </>
                      ) : (
                        <>
                          <Feather
                            name={user.isFollowing ? 'user-minus' : 'user-plus'}
                            size={10}
                            color={user.isFollowing ? '#EF4444' : 'white'}
                          />
                          <Text
                            color={user.isFollowing ? '$red11' : 'white'}
                            fontSize="$1"
                            fontWeight="500"
                          >
                            {user.isFollowing ? 'Unfollow' : 'Follow'}
                          </Text>
                        </>
                      )}
                    </XStack>
                  )}
                </Button>
              )}
            </YStack>
          </TouchableOpacity>
        ))}
      </XStack>
    </ScrollView>
  );
}
