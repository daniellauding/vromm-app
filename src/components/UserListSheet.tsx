import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { YStack, XStack, Text, Card, Input, useTheme } from 'tamagui';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTabContentPadding } from '../utils/layout';
import { inviteNewUser } from '../services/invitationService';
import { relLog } from '../utils/relationshipDebug';
import { format } from 'date-fns';

const { height } = Dimensions.get('window');

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

interface UserListSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onUserPress?: (userId: string) => void;
  filterByRole?: string;
}

export function UserListSheet({
  visible,
  onClose,
  title,
  onUserPress,
  filterByRole,
}: UserListSheetProps) {
  const insets = useSafeAreaInsets();
  const { user, profile: currentUserProfile } = useAuth();
  const { t, language } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const theme = useTheme();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // State (exact copy from UsersScreen)
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState<{ [key: string]: boolean }>({});
  const [relationshipLoading, setRelationshipLoading] = useState<{ [key: string]: boolean }>({});
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('all');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch users function (enhanced with search and role filtering)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
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

      // Apply role filter - use activeRoleFilter state or prop filterByRole
      const roleFilter = filterByRole || (activeRoleFilter !== 'all' ? activeRoleFilter : null);
      if (roleFilter && roleFilter !== 'all') {
        if (roleFilter === 'supervisor') {
          // Handle supervisor filter - include instructor and admin roles only
          query = query.in('role', ['instructor', 'admin']);
        } else {
          query = query.eq('role', roleFilter);
        }
      }

      // Apply search filter if specified
      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

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
  }, [user?.id, filterByRole, activeRoleFilter, searchQuery]);

  // Handle functions (exact copy from UsersScreen)
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
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const navigateToProfile = (userId: string) => {
    if (onUserPress) {
      onUserPress(userId);
    } else {
      navigation.navigate('PublicProfile', { userId });
      onClose();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible, fetchUsers]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      // The search will be triggered by the useEffect dependency on searchQuery
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Clean up search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Render user item (exact copy from UsersScreen)
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
                          {user.isFollowing
                            ? getTranslation(
                                'users.unfollow',
                                language === 'sv' ? 'Sluta följa' : 'Unfollow'
                              )
                            : getTranslation(
                                'users.follow',
                                language === 'sv' ? 'Följ' : 'Follow'
                              )}
                        </Text>
                      </>
                    )}
                  </XStack>
                </Button>
              </XStack>
            )}
          </YStack>
        </XStack>
      </Card>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.85}
              maxHeight={height * 0.85}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="bold" color="$color">
                  {title}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack>

              {/* Search Input */}
              <YStack gap="$2">
                <XStack
                  backgroundColor="$backgroundHover"
                  borderRadius="$4"
                  padding="$3"
                  alignItems="center"
                  gap="$2"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <Feather name="search" size={16} color={iconColor} />
                  <Input
                    flex={1}
                    placeholder={getTranslation(
                      'userList.searchPlaceholder',
                      language === 'sv'
                        ? 'Sök användare efter namn eller e-post...'
                        : 'Search users by name or email...'
                    )}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    backgroundColor="transparent"
                    borderWidth={0}
                    color="$color"
                    fontSize="$4"
                    paddingHorizontal={0}
                    focusStyle={{
                      borderWidth: 0,
                    }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Feather name="x" size={16} color={iconColor} />
                    </TouchableOpacity>
                  )}
                </XStack>

                {/* Role Filter Tabs */}
                <XStack gap="$2" flexWrap="wrap" justifyContent="center">
                  <TouchableOpacity
                    onPress={() => setActiveRoleFilter('all')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: activeRoleFilter === 'all' ? '#00E6C3' : 'transparent',
                      borderWidth: 1,
                      borderColor: activeRoleFilter === 'all' ? '#00E6C3' : '#ccc',
                    }}
                  >
                    <Text
                      color={activeRoleFilter === 'all' ? 'white' : '$color'}
                      fontWeight={activeRoleFilter === 'all' ? 'bold' : 'normal'}
                      fontSize="$3"
                    >
                      {getTranslation(
                        'userList.tabs.all',
                        language === 'sv' ? 'Alla användare' : 'All Users'
                      )}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveRoleFilter('student')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: activeRoleFilter === 'student' ? '#00E6C3' : 'transparent',
                      borderWidth: 1,
                      borderColor: activeRoleFilter === 'student' ? '#00E6C3' : '#ccc',
                    }}
                  >
                    <Text
                      color={activeRoleFilter === 'student' ? 'white' : '$color'}
                      fontWeight={activeRoleFilter === 'student' ? 'bold' : 'normal'}
                      fontSize="$3"
                    >
                      {getTranslation(
                        'userList.tabs.students',
                        language === 'sv' ? 'Elever' : 'Students'
                      )}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveRoleFilter('supervisor')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: activeRoleFilter === 'supervisor' ? '#00E6C3' : 'transparent',
                      borderWidth: 1,
                      borderColor: activeRoleFilter === 'supervisor' ? '#00E6C3' : '#ccc',
                    }}
                  >
                    <Text
                      color={activeRoleFilter === 'supervisor' ? 'white' : '$color'}
                      fontWeight={activeRoleFilter === 'supervisor' ? 'bold' : 'normal'}
                      fontSize="$3"
                    >
                      {getTranslation(
                        'userList.tabs.supervisors',
                        language === 'sv' ? 'Handledare' : 'Supervisors'
                      )}
                    </Text>
                  </TouchableOpacity>
                </XStack>
              </YStack>

              {/* Users List */}
              <YStack flex={1}>
                {loading ? (
                  <YStack alignItems="center" justifyContent="center" flex={1}>
                    <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
                  </YStack>
                ) : users.length === 0 ? (
                  <YStack alignItems="center" justifyContent="center" flex={1} gap="$2">
                    <Feather name="users" size={48} color="#666" />
                    <Text color="$gray11" textAlign="center">
                      {getTranslation(
                        'users.noUsers',
                        language === 'sv' ? 'Inga användare hittades' : 'No users found'
                      )}
                    </Text>
                  </YStack>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#00E6C3"
                        colors={['#00E6C3']}
                        progressBackgroundColor="#1a1a1a"
                      />
                    }
                    contentContainerStyle={{ paddingBottom: getTabContentPadding() }}
                  >
                    <YStack gap="$3">{users.map(renderUserItem)}</YStack>
                  </ScrollView>
                )}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
