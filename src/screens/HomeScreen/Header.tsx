import React, { useRef, useEffect, useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { Modal, ScrollView, TouchableOpacity, View, Alert, Image, Animated, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Calendar } from '@tamagui/lucide-icons';

// ADD MESSAGING COMPONENTS
// import { MessageBell } from '../../components/MessageBell';
// import { NotificationBell } from '../../components/NotificationBell';
// import { EventsBell } from '../../components/EventsBell';
import { MessagesSheet } from '../../components/MessagesSheet';
import { NotificationsSheet } from '../../components/NotificationsSheet';
import { EventsSheet } from '../../components/EventsSheet';

import { useAuth } from '@/src/context/AuthContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { supabase } from '../../lib/supabase';
import { useTourTarget } from '../../components/TourOverlay';
import { ProfileSheet } from '../../components/ProfileSheet';
import { UserProfileSheet } from '../../components/UserProfileSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useThemeColor } from '../../hooks/useThemeColor';

export const HomeHeader = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { profile, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { setActiveStudent, activeStudentId } = useStudentSwitch();
  const insets = useSafeAreaInsets();

  // Register profile avatar for instructor tour targeting
  const profileAvatarRef = useTourTarget('Header.ProfileAvatar');

  const [showStudentPicker, setShowStudentPicker] = React.useState(false);
  const [students, setStudents] = React.useState<Array<{ id: string; full_name: string; email: string; created_at?: string }>>([]);
  const isSupervisorRole = ['instructor', 'admin', 'school'].includes((profile as any)?.role || '');
  
  // Sheet states
  const [showMessagesSheet, setShowMessagesSheet] = React.useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = React.useState(false);
  const [showEventsSheet, setShowEventsSheet] = React.useState(false);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const [showProfileSheet, setShowProfileSheet] = React.useState(false);
  const [showUserProfileSheet, setShowUserProfileSheet] = React.useState(false);

  // Progress state for avatar circle
  const [userProgress, setUserProgress] = useState(0);

  // Animation refs for avatar modal
  const avatarBackdropOpacity = useRef(new Animated.Value(0)).current;
  const avatarSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Theme colors
  const backgroundColor = colorScheme === 'dark' ? '#1C1C1C' : '#fff';
  const textColor = colorScheme === 'dark' ? '#ECEDEE' : '#11181C';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E0E0E0';

  // ProgressCircle component for avatar
  const ProgressCircle = ({ percent, size = 44, color = '#00E6C3', bg = '#333' }) => {
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(percent, 1));
    return (
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference},${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
    );
  };

  // Load user progress (works for both regular users and instructors simulating students)
  const loadUserProgress = React.useCallback(async () => {
    const effectiveUserId = activeStudentId || profile?.id;
    if (!effectiveUserId) {
      setUserProgress(0);
      return;
    }

    try {
      // Get all learning paths
      const { data: paths, error: pathsError } = await supabase
        .from('learning_paths')
        .select('id, learning_path_exercises(id)')
        .eq('active', true);

      if (pathsError || !paths) {
        console.log('🔍 [Header] Error loading paths:', pathsError);
        setUserProgress(0);
        return;
      }

      // Get user's completed exercises
      const { data: completions, error: completionsError } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      if (completionsError) {
        console.log('🔍 [Header] Error loading completions:', completionsError);
        setUserProgress(0);
        return;
      }

      // Calculate overall progress
      const completedIds = completions?.map(c => c.exercise_id) || [];
      const totalExercises = paths.reduce((total, path) => total + path.learning_path_exercises.length, 0);
      const completedExercises = paths.reduce((total, path) => {
        return total + path.learning_path_exercises.filter(ex => completedIds.includes(ex.id)).length;
      }, 0);

      const progress = totalExercises > 0 ? completedExercises / totalExercises : 0;
      setUserProgress(progress);
      
      console.log('🔍 [Header] Progress calculated:', {
        effectiveUserId,
        totalExercises,
        completedExercises,
        progress: Math.round(progress * 100) + '%'
      });
    } catch (error) {
      console.error('🔍 [Header] Error calculating progress:', error);
      setUserProgress(0);
    }
  }, [activeStudentId, profile?.id]);

  // Load progress when user changes
  useEffect(() => {
    loadUserProgress();
  }, [loadUserProgress]);

  // Animation effects for avatar modal
  useEffect(() => {
    if (showAvatarModal) {
      Animated.timing(avatarBackdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(avatarSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(avatarBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(avatarSheetTranslateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showAvatarModal, avatarBackdropOpacity, avatarSheetTranslateY]);

  const loadSupervisedStudents = React.useCallback(async (): Promise<Array<{ id: string; full_name: string; email: string; created_at?: string }>> => {
    if (!profile?.id) {
      setStudents([]);
      return [];
    }
    try {
      // Step 1: fetch relationships
      const { data: rels, error: relErr } = await supabase
        .from('student_supervisor_relationships')
        .select('student_id, created_at')
        .eq('supervisor_id', profile.id)
        .order('created_at', { ascending: false });
      if (relErr) throw relErr;

      const studentIds = (rels || []).map((r: any) => r.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return [];
      }

      // Step 2: fetch profile details
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds);
      if (profErr) throw profErr;

      const createdAtById = Object.fromEntries((rels || []).map((r: any) => [r.student_id, r.created_at]));
      const list: Array<{ id: string; full_name: string; email: string; created_at?: string }> = (profs || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || '',
        created_at: createdAtById[p.id],
      }));
      setStudents(list);
      return list;
    } catch (e) {
      console.warn('Failed to load supervised students', e);
      setStudents([]);
      return [];
    }
  }, [profile?.id]);

  const onPressAvatar = () => {
    setShowAvatarModal(true);
  };

  const handleViewProfile = () => {
    console.log('🔍 [Header] View Profile clicked - closing avatar modal and opening UserProfileSheet');
    setShowAvatarModal(false);
    setShowUserProfileSheet(true);
  };

  const handleSelectStudent = async () => {
    setShowAvatarModal(false);
    try {
      const list = (await loadSupervisedStudents()) || [];
      if ((list?.length || 0) > 0) {
        setShowStudentPicker(true);
      } else {
        Alert.alert('No Students', 'You don\'t have any students yet.');
      }
    } catch {
      Alert.alert('Error', 'Failed to load students.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            setShowAvatarModal(false);
            signOut();
          }
        }
      ]
    );
  };
  return (
    <YStack
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="$4"
      marginBottom="$2"
    >
      <XStack alignItems="center" gap={12} width="100%" justifyContent="space-between">
        <YStack gap={8} flexShrink={1} alignItems="flex-start" width="100%">
          <View style={{ position: 'relative' }}>
            {/* Progress Circle */}
            {userProgress > 0 && (
              <ProgressCircle 
                percent={userProgress} 
                size={44} 
                color="#00E6C3" 
                bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'} 
              />
            )}
            
            <TouchableOpacity
              ref={profileAvatarRef}
              onPress={onPressAvatar}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#333',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: activeStudentId ? 2 : 0,
                borderColor: activeStudentId ? '#00E6C3' : 'transparent',
                margin: 2, // Small margin to show progress circle
              }}
            >
              {/* Show avatar image if present */}
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Feather name="user" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text fontSize="$6" fontWeight="800" fontStyle="italic" color="$color" numberOfLines={5}>
            {profile?.full_name &&
            !profile.full_name.includes('@') &&
            profile.full_name !== 'Unknown' &&
            !profile.full_name.startsWith('user_')
              ? t('home.welcomeWithName').replace('{name}', profile.full_name)
              : t('home.welcome')}
          </Text>
        </YStack>

        {/* <XStack gap={12} alignItems="center">
          <MessageBell onPress={() => setShowMessagesSheet(true)} />
          <NotificationBell onPress={() => setShowNotificationsSheet(true)} />
          <EventsBell onPress={() => setShowEventsSheet(true)} />
        </XStack> */}
      </XStack>

      {/* Student picker modal (only opens for instructor/admin/school) */}
      <Modal
        visible={showStudentPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowStudentPicker(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: '#1a1a1a', borderRadius: 12, maxHeight: '70%', padding: 16 }}
          >
            <Text size="lg" weight="bold" color="#fff" style={{ marginBottom: 12 }}>
              Select student to view
            </Text>
            <ScrollView>
              <TouchableOpacity
                onPress={() => {
                  setActiveStudent(null);
                  setShowStudentPicker(false);
                }}
                style={{ paddingVertical: 10 }}
              >
                <XStack alignItems="center" gap={8}>
                  <Feather name="user" size={16} color="#888" />
                  <Text color="#fff">My own profile</Text>
                </XStack>
              </TouchableOpacity>
              {students.length === 0 ? (
                <Text color="#ddd" style={{ paddingVertical: 10 }}>
                  {isSupervisorRole ? 'No students yet' : 'Not available for your role'}
                </Text>
              ) : (
                students.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setActiveStudent(s.id, s.full_name || null);
                      setShowStudentPicker(false);
                    }}
                    style={{ paddingVertical: 10 }}
                  >
                    <XStack alignItems="center" gap={8}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14, backgroundColor: '#333',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: activeStudentId === s.id ? 2 : 0, borderColor: '#00E6C3'
                      }}>
                        <Feather name="user" size={14} color="#fff" />
                      </View>
                      <YStack>
                        <Text color="#fff" weight="semibold" size="sm">{s.full_name || 'Unknown'}</Text>
                        <Text color="#ccc" size="xs">{s.email}</Text>
                      </YStack>
                    </XStack>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Avatar Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: avatarBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowAvatarModal(false)} />
            <Animated.View
              style={{
                transform: [{ translateY: avatarSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$6" fontWeight="bold" color={textColor}>
                    {t('profile.menu') || 'Profile Menu'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                    <Feather name="x" size={24} color={textColor} />
                  </TouchableOpacity>
                </XStack>

                {/* Menu Options */}
                <YStack gap="$2">
                  {/* View Profile */}
                  <TouchableOpacity
                    onPress={handleViewProfile}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                    }}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Feather name="user" size={24} color={textColor} />
                      <YStack flex={1}>
                        <Text fontWeight="600" fontSize={18} color={textColor}>
                          {t('profile.viewProfile') || 'View Profile'}
                        </Text>
                        <Text fontSize={14} color={colorScheme === 'dark' ? '#999' : '#666'}>
                          {t('profile.viewProfileDescription') || 'View and edit your profile'}
                        </Text>
                      </YStack>
                    </XStack>
                  </TouchableOpacity>

                  {/* Select Student (only for instructors) */}
                  {isSupervisorRole && (
                    <TouchableOpacity
                      onPress={handleSelectStudent}
                      style={{
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                      }}
                    >
                      <XStack alignItems="center" gap="$3">
                        <Feather name="users" size={24} color={textColor} />
                        <YStack flex={1}>
                          <Text fontWeight="600" fontSize={18} color={textColor}>
                            {t('profile.switchStudent') || 'Switch Student View'}
                          </Text>
                          <Text fontSize={14} color={colorScheme === 'dark' ? '#999' : '#666'}>
                            {t('profile.switchStudentDescription') || 'View progress as a student'}
                          </Text>
                        </YStack>
                      </XStack>
                    </TouchableOpacity>
                  )}

                  {/* Logout */}
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                    }}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Feather name="log-out" size={24} color="#FF6B6B" />
                      <YStack flex={1}>
                        <Text fontWeight="600" fontSize={18} color="#FF6B6B">
                          {t('auth.logout') || 'Logout'}
                        </Text>
                        <Text fontSize={14} color={colorScheme === 'dark' ? '#999' : '#666'}>
                          {t('auth.logoutDescription') || 'Sign out of your account'}
                        </Text>
                      </YStack>
                    </XStack>
                  </TouchableOpacity>
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Profile Sheet */}
      <ProfileSheet
        visible={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
      />

      {/* User Profile Sheet */}
      {console.log('🔍 [Header] Rendering UserProfileSheet with visible:', showUserProfileSheet, 'userId:', profile?.id)}
      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => {
          console.log('🔍 [Header] UserProfileSheet onClose called');
          setShowUserProfileSheet(false);
        }}
        userId={profile?.id || null}
        onViewAllRoutes={(userId) => {
          // Handle view all routes navigation
          console.log('View all routes for user:', userId);
        }}
        onEditProfile={() => {
          console.log('🔍 [Header] Edit Profile clicked - closing UserProfileSheet and opening ProfileSheet');
          setShowUserProfileSheet(false);
          setShowProfileSheet(true);
        }}
      />

      {/* Messages Sheet */}
      <MessagesSheet
        visible={showMessagesSheet}
        onClose={() => setShowMessagesSheet(false)}
      />

      {/* Notifications Sheet */}
      <NotificationsSheet
        visible={showNotificationsSheet}
        onClose={() => setShowNotificationsSheet(false)}
      />

      {/* Events Sheet */}
      <EventsSheet
        visible={showEventsSheet}
        onClose={() => setShowEventsSheet(false)}
      />
    </YStack>
  );
};
