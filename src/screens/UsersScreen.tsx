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

type User = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  location?: string;
  created_at: string;
  role?: string;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
};

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { user } = useAuth();

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
          location,
          created_at,
          role
        `,
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let usersWithFollowStatus = data || [];

      // If user is authenticated, check follow status for each user
      if (user?.id) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(followData?.map(f => f.following_id) || []);

        usersWithFollowStatus = (data || []).map(userData => ({
          ...userData,
          isFollowing: followingIds.has(userData.id),
          isCurrentUser: userData.id === user.id
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

  const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      if (!user?.id || followLoading[targetUserId]) return;
      
      setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));

      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setUsers(prev => prev.map(u => 
          u.id === targetUserId ? { ...u, isFollowing: false } : u
        ));
        console.log('👤 User unfollowed');
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert([{
            follower_id: user.id,
            following_id: targetUserId,
          }]);

        if (error) throw error;

        setUsers(prev => prev.map(u => 
          u.id === targetUserId ? { ...u, isFollowing: true } : u
        ));
        console.log('👤 User followed');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
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

            {/* Follow/Unfollow Button */}
            {!user.isCurrentUser && (
              <Button
                size="sm"
                variant={user.isFollowing ? "secondary" : "primary"}
                backgroundColor={user.isFollowing ? "$red5" : "$blue10"}
                onPress={() => handleFollow(user.id, user.isFollowing || false)}
                disabled={followLoading[user.id]}
                minWidth={80}
              >
                <XStack gap="$1" alignItems="center">
                  {followLoading[user.id] ? (
                    <Text color={user.isFollowing ? "$red11" : "white"} fontSize="$2">
                      ...
                    </Text>
                  ) : (
                    <>
                      <Feather 
                        name={user.isFollowing ? "user-minus" : "user-plus"} 
                        size={12} 
                        color={user.isFollowing ? "#EF4444" : "white"} 
                      />
                      <Text color={user.isFollowing ? "$red11" : "white"} fontSize="$2" fontWeight="500">
                        {user.isFollowing ? 'Unfollow' : 'Follow'}
                      </Text>
                    </>
                  )}
                </XStack>
              </Button>
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
