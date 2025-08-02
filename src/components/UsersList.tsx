import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, useColorScheme } from 'react-native';
import { XStack, YStack, ScrollView, View, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

type User = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, location, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        let usersWithFollowStatus = data || [];

        // If user is authenticated, check follow status for each user
        if (user?.id) {
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

              {/* Follow/Unfollow Button */}
              {!user.isCurrentUser && (
                <Button
                  size="xs"
                  variant={user.isFollowing ? 'secondary' : 'primary'}
                  backgroundColor={user.isFollowing ? '$red5' : '$blue10'}
                  onPress={() => handleFollow(user.id, user.isFollowing || false)}
                  disabled={followLoading[user.id]}
                  marginTop="$2"
                  width="100%"
                >
                  {followLoading[user.id] ? (
                    <Text color={user.isFollowing ? '$red11' : 'white'} fontSize="$1">
                      ...
                    </Text>
                  ) : (
                    <XStack gap="$1" alignItems="center">
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
