import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, Alert, StyleSheet, useColorScheme, Dimensions, Share } from 'react-native';
import { YStack, XStack, Card, ScrollView, Separator } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { ReportDialog } from '../components/report/ReportDialog';
import { ProfileButton } from '../components/ProfileButton';
import { useFocusEffect } from '@react-navigation/native';
import { parseRecordingStats, isRecordedRoute } from '../utils/routeUtils';
import { messageService } from '../services/messageService';
import { inviteNewUser } from '../services/invitationService';

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  routes_created: number;
  routes_driven: number;
  routes_saved: number;
  reviews_given: number;
  average_rating: number;
  total_distance_driven: number; // in km
  total_duration_driven: number; // in seconds
  recorded_routes_created: number; // routes created using recording
  email: string | null;
  school: {
    name: string;
    id: string;
  } | null;
  supervisor: {
    id: string;
    full_name: string;
  } | null;
};

const windowWidth = Dimensions.get('window').width;

export function PublicProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { user, profile: currentUserProfile } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Get userId from route params with enhanced logging
  const params = route.params || {};
  const userId = params.userId;

  console.log('PublicProfileScreen: Received params:', params);
  console.log('PublicProfileScreen: userId:', userId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [learningPathSteps, setLearningPathSteps] = useState({
    total: 25,
    completed: 0,
    currentTitle: '',
  });
  const [showAdminControls, setShowAdminControls] = useState(false);

  // Follow/Unfollow system state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Relationship data
  const [supervisors, setSupervisors] = useState<
    Array<{ supervisor_id: string; supervisor_name: string; supervisor_email: string }>
  >([]);
  const [schools, setSchools] = useState<
    Array<{ school_id: string; school_name: string; school_location: string }>
  >([]);
  
  // Instructor/Student relationship states
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    if (userId && user?.id && userId !== user.id) {
      loadFollowData();
      checkRelationshipStatus();
    }
    if (userId) {
      loadUserRelationships();
    }
  }, [userId, route.params?.refresh, user?.id]);

  // Check if this is the current user's profile
  useEffect(() => {
    if (user && profile) {
      setIsCurrentUser(user.id === profile.id);
    }
  }, [user, profile]);

  // Fetch learning path data when profile loads
  useEffect(() => {
    if (profile?.id) {
      fetchLearningPathData();
    }
  }, [profile?.id]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data && data.role === 'admin') {
          setShowAdminControls(true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Function to fetch learning path data
  const fetchLearningPathData = async () => {
    try {
      // Fetch completed steps
      const { data: completedData } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', userId);

      const completedCount = completedData?.length || 0;

      // Fetch the first learning path to get title
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true })
        .limit(1);

      const currentTitle = pathData?.[0]?.title?.en || '';

      setLearningPathSteps({
        total: 25, // Hardcoded total as specified
        completed: completedCount,
        currentTitle,
      });
    } catch (err) {
      console.error('Error fetching learning path data:', err);
    }
  };

  // Force profile refresh on mount and when navigation params change
  useFocusEffect(
    useCallback(() => {
      console.log('PublicProfile screen focused, refreshing data');
      loadProfile();
    }, [userId, route.params?.refresh]),
  );

  const loadProfile = async () => {
    console.log('PublicProfileScreen.loadProfile: Starting with userId:', userId);

    if (!userId) {
      console.error('PublicProfileScreen.loadProfile: No user ID provided in params');
      setError('No user ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      console.log('PublicProfileScreen.loadProfile: Fetching profile for userId:', userId);
      // Get profile data with counts - ensure proper field selection
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          id,
          license_plan_completed,
          license_plan_data,
          school:school_id(*)
        `,
        )
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      // Get counts and driving statistics
      const counts = await Promise.all([
        // Count routes created
        supabase.from('routes').select('id', { count: 'exact' }).eq('creator_id', userId),

        // Count routes driven
        supabase.from('driven_routes').select('id', { count: 'exact' }).eq('user_id', userId),

        // Count routes saved
        supabase.from('saved_routes').select('id', { count: 'exact' }).eq('user_id', userId),

        // Count reviews given
        supabase.from('route_reviews').select('id', { count: 'exact' }).eq('user_id', userId),

        // Average rating
        supabase.from('route_reviews').select('rating').eq('user_id', userId),

        // Recent routes created
        supabase
          .from('routes')
          .select('id, name, created_at, difficulty, spot_type')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),

        // Recent reviews
        supabase
          .from('route_reviews')
          .select('id, rating, content, created_at, route:route_id(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),

        // Get all routes created by user for driving stats calculation
        supabase.from('routes').select('description, metadata').eq('creator_id', userId),

        // Get all routes driven by user (via driven_routes table)
        supabase
          .from('driven_routes')
          .select('route:route_id(description, metadata)')
          .eq('user_id', userId),
      ]);

      const reviewsWithRating = counts[4].data || [];
      const averageRating =
        reviewsWithRating.length > 0
          ? reviewsWithRating.reduce((sum: number, review: any) => sum + review.rating, 0) /
            reviewsWithRating.length
          : 0;

      // Calculate driving statistics from both created and driven routes
      const createdRoutes = counts[7].data || [];
      const drivenRoutesData = counts[8].data || [];

      // Extract actual route data from driven_routes (which has nested route data)
      const drivenRoutes = drivenRoutesData
        .map((dr: any) => dr.route)
        .filter((route: any) => route !== null);

      // Combine all routes (avoid duplicates by checking route content)
      const allRoutesMap = new Map();

      // Add created routes
      createdRoutes.forEach((route: any) => {
        if (route.description) {
          allRoutesMap.set(route.description, route);
        }
      });

      // Add driven routes (may include duplicates if user created and drove same route)
      drivenRoutes.forEach((route: any) => {
        if (route && route.description) {
          allRoutesMap.set(route.description, route);
        }
      });

      const allUniqueRoutes = Array.from(allRoutesMap.values());

      let totalDistanceDriven = 0; // in km
      let totalDurationDriven = 0; // in seconds
      let recordedRoutesCount = 0;

      console.log('🚗 Processing routes for driving stats:', {
        userId,
        createdRoutesCount: createdRoutes.length,
        drivenRoutesCount: drivenRoutes.length,
        uniqueRoutesCount: allUniqueRoutes.length,
      });

      allUniqueRoutes.forEach((route: any, index: number) => {
        console.log(`🚗 Processing route ${index + 1}:`, {
          hasDescription: !!route.description,
          description: route.description?.substring(0, 100) + '...',
          isRecorded: isRecordedRoute(route),
        });

        // Check if this is a recorded route
        if (isRecordedRoute(route)) {
          recordedRoutesCount++;

          // Parse recording stats from description
          const recordingStats = parseRecordingStats(route.description || '');
          console.log(`🚗 Route ${index + 1} recording stats:`, recordingStats);

          if (recordingStats) {
            // Parse distance (format: "X.XX km")
            const distanceMatch = recordingStats.distance.match(/([0-9.]+)/);
            if (distanceMatch) {
              const distance = parseFloat(distanceMatch[1]);
              totalDistanceDriven += distance;
              console.log(`🚗 Added distance: ${distance} km`);
            }

            // Parse duration (format: "HH:MM" or "MM:SS")
            const durationParts = recordingStats.drivingTime.split(':');
            if (durationParts.length === 2) {
              const minutes = parseInt(durationParts[0]);
              const seconds = parseInt(durationParts[1]);
              const duration = minutes * 60 + seconds;
              totalDurationDriven += duration;
              console.log(`🚗 Added duration: ${duration} seconds (${minutes}m ${seconds}s)`);
            } else if (durationParts.length === 3) {
              const hours = parseInt(durationParts[0]);
              const minutes = parseInt(durationParts[1]);
              const seconds = parseInt(durationParts[2]);
              const duration = hours * 3600 + minutes * 60 + seconds;
              totalDurationDriven += duration;
              console.log(
                `🚗 Added duration: ${duration} seconds (${hours}h ${minutes}m ${seconds}s)`,
              );
            }
          }
        }
      });

      console.log('🚗 Final driving stats calculated:', {
        userId,
        totalDistanceDriven: totalDistanceDriven.toFixed(2) + ' km',
        totalDurationDriven: Math.floor(totalDurationDriven / 60) + ' minutes',
        recordedRoutesCount,
        createdRoutesProcessed: createdRoutes.length,
        drivenRoutesProcessed: drivenRoutes.length,
        uniqueRoutesProcessed: allUniqueRoutes.length,
      });

      // Create complete profile object with driving stats
      const profileWithCounts = {
        ...data,
        routes_created: counts[0].count || 0,
        routes_driven: counts[1].count || 0,
        routes_saved: counts[2].count || 0,
        reviews_given: counts[3].count || 0,
        average_rating: averageRating,
        total_distance_driven: totalDistanceDriven,
        total_duration_driven: totalDurationDriven,
        recorded_routes_created: recordedRoutesCount,
      };

      setProfile(profileWithCounts);
      setRecentRoutes(counts[5].data || []);
      setRecentReviews(counts[6].data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    // Navigate to the edit screen within the nested stack
    navigation.navigate('ProfileScreen');
  };

  const handleViewAllRoutes = () => {
    navigation.navigate('RouteList', {
      title: t('profile.routesCreated') || 'Created Routes',
      routes: recentRoutes,
      type: 'created',
      creatorId: userId,
    });
  };

  const handleReport = () => {
    setShowReportDialog(true);
  };

  const handleShare = async () => {
    if (!profile) return;

    const baseUrl = 'https://routes.vromm.se';
    const shareUrl = `${baseUrl}/?publicProfile=${profile.id}`;

    try {
      await Share.share({
        message: `Check out ${profile.full_name}'s profile on Vromm`,
        url: shareUrl, // iOS only
        title: profile.full_name || 'User Profile',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  const handleMessage = async () => {
    if (!profile || !user?.id || profile.id === user.id) return;

    try {
      // Check if conversation already exists
      const conversations = await messageService.getConversations();
      const existingConversation = conversations.find(
        (conv) => !conv.is_group && conv.participants?.some((p) => p.user_id === profile.id),
      );

      if (existingConversation) {
        // Navigate to existing conversation
        navigation.navigate('Conversation', { conversationId: existingConversation.id });
      } else {
        // Create new conversation
        const conversation = await messageService.createConversation([profile.id]);
        navigation.navigate('Conversation', { conversationId: conversation.id });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  // ==================== USER RELATIONSHIPS ====================

  const loadUserRelationships = async () => {
    try {
      if (!userId) return;

      // Get supervisors using the RPC function
      const { data: supervisorsData, error: supervisorsError } = await supabase.rpc(
        'get_user_supervisor_details',
        { target_user_id: userId },
      );

      // Get schools using direct table query since the function doesn't exist
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('school_memberships')
        .select(
          `
          school_id,
          schools!inner(
            id,
            name,
            location
          )
        `,
        )
        .eq('user_id', userId);

      if (supervisorsError) {
        console.error('Error fetching user supervisors:', supervisorsError);
      } else {
        setSupervisors(supervisorsData || []);
      }

      // Transform school data to match expected format
      const transformedSchools = schoolsError
        ? []
        : schoolsData?.map((membership) => ({
            school_id: membership.school_id,
            school_name: membership.schools.name,
            school_location: membership.schools.location,
          })) || [];

      if (schoolsError) {
        console.error('Error fetching user schools:', schoolsError);
      } else {
        setSchools(transformedSchools);
      }

      console.log('📊 User relationships loaded:', {
        supervisorCount: supervisorsData?.length || 0,
        schoolCount: transformedSchools.length,
      });
    } catch (error) {
      console.error('Error loading user relationships:', error);
    }
  };

  // ==================== FOLLOW/UNFOLLOW SYSTEM ====================

  const loadFollowData = async () => {
    try {
      if (!user?.id || !userId) return;

      // Check if current user is following this profile
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!followData);

      // Get followers count for this profile
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId);

      // Get following count for this profile
      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId);

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);

      console.log('📊 Follow data loaded:', {
        isFollowing: !!followData,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      });
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  // Check if current user has instructor/student relationship with this profile
  const checkRelationshipStatus = async () => {
    if (!user?.id || !userId) return;
    
    try {
      // Check if this profile is supervising the current user
      const { data: instructorData } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .eq('student_id', user.id)
        .eq('supervisor_id', userId)
        .single();
      
      setIsInstructor(!!instructorData);
      
      // Check if current user is supervising this profile
      const { data: studentData } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .eq('supervisor_id', user.id)
        .eq('student_id', userId)
        .single();
      
      setIsStudent(!!studentData);
    } catch (error) {
      console.log('No existing relationship');
    }
  };
  
  // Handle set/unset as instructor
  const handleInstructorToggle = async () => {
    if (!user?.id || !userId || relationshipLoading) return;
    
    console.log('🎓 INSTRUCTOR TOGGLE - Starting');
    console.log('🎓 Current user ID:', user.id);
    console.log('🎓 Target user ID:', userId);
    console.log('🎓 Current isInstructor state:', isInstructor);
    console.log('🎓 Action:', isInstructor ? 'UNSET as instructor' : 'SET as instructor');
    
    try {
      setRelationshipLoading(true);
      
      if (isInstructor) {
        // Remove instructor relationship
        console.log('🎓 REMOVING instructor relationship...');
        console.log('🎓 DELETE WHERE student_id =', user.id, 'AND supervisor_id =', userId);
        
        const { error } = await supabase
          .from('student_supervisor_relationships')
          .delete()
          .eq('student_id', user.id)
          .eq('supervisor_id', userId);
        
        if (error) throw error;
        
        console.log('✅ INSTRUCTOR REMOVED successfully');
        setIsInstructor(false);
        Alert.alert('Success', 'Removed as your instructor');
      } else {
        // Invite instructor instead of creating relationship directly
        console.log('🎓 SENDING INSTRUCTOR INVITATION...');
        if (!profile?.email) {
          throw new Error('Target user has no email on file. Cannot send invitation.');
        }
        const result = await inviteNewUser({
          email: profile.email,
          role: 'instructor',
          supervisorId: user.id,
          supervisorName: currentUserProfile?.full_name || undefined,
          inviterRole: (currentUserProfile as any)?.role,
          relationshipType: 'student_invites_supervisor',
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send invitation');
        }

        console.log('✅ INSTRUCTOR INVITATION SENT');
        // Do not set isInstructor yet; wait for acceptance
        Alert.alert('Invitation Sent', 'An invitation has been sent to become your instructor.');
      }
      
      // Reload relationships
      loadUserRelationships();
    } catch (error) {
      console.error('❌ ERROR toggling instructor:', error);
      Alert.alert('Error', 'Failed to update instructor status');
    } finally {
      setRelationshipLoading(false);
      console.log('🎓 INSTRUCTOR TOGGLE - Complete');
    }
  };
  
  // Handle set/unset as student
  const handleStudentToggle = async () => {
    if (!user?.id || !userId || relationshipLoading) return;
    
    console.log('👨‍🎓 STUDENT TOGGLE - Starting');
    console.log('👨‍🎓 Current user ID:', user.id);
    console.log('👨‍🎓 Target user ID:', userId);
    console.log('👨‍🎓 Current isStudent state:', isStudent);
    console.log('👨‍🎓 Action:', isStudent ? 'UNSET as student' : 'SET as student');
    
    try {
      setRelationshipLoading(true);
      
      if (isStudent) {
        // Remove student relationship
        console.log('👨‍🎓 REMOVING student relationship...');
        console.log('👨‍🎓 DELETE WHERE supervisor_id =', user.id, 'AND student_id =', userId);
        
        const { error } = await supabase
          .from('student_supervisor_relationships')
          .delete()
          .eq('supervisor_id', user.id)
          .eq('student_id', userId);
        
        if (error) throw error;
        
        console.log('✅ STUDENT REMOVED successfully');
        setIsStudent(false);
        Alert.alert('Success', 'Removed as your student');
      } else {
        // Invite student instead of creating relationship directly
        console.log('👨‍🎓 SENDING STUDENT INVITATION...');
        if (!profile?.email) {
          throw new Error('Target user has no email on file. Cannot send invitation.');
        }
        const result = await inviteNewUser({
          email: profile.email,
          role: 'student',
          supervisorId: user.id,
          supervisorName: currentUserProfile?.full_name || undefined,
          inviterRole: (currentUserProfile as any)?.role,
          relationshipType: 'supervisor_invites_student',
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to send invitation');
        }

        console.log('✅ STUDENT INVITATION SENT');
        // Do not set isStudent yet; wait for acceptance
        Alert.alert('Invitation Sent', 'An invitation has been sent to add this user as your student.');
      }
    } catch (error) {
      console.error('❌ ERROR toggling student:', error);
      Alert.alert('Error', 'Failed to update student status');
    } finally {
      setRelationshipLoading(false);
      console.log('👨‍🎓 STUDENT TOGGLE - Complete');
    }
  };
  
  const handleFollow = async () => {
    try {
      if (!user?.id || !userId || followLoading) return;

      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
        console.log('👤 User unfollowed');
      } else {
        // Follow
        const { error } = await supabase.from('user_follows').insert([
          {
            follower_id: user.id,
            following_id: userId,
          },
        ]);

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        console.log('👤 User followed');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Add admin delete function
  const handleAdminDeleteUser = async () => {
    if (!showAdminControls || !profile) return;

    // Don't allow admins to delete themselves
    if (user?.id === profile.id) {
      Alert.alert('Admin Action', 'You cannot delete your own account');
      return;
    }

    Alert.alert(
      'Admin: Delete User',
      `Are you sure you want to delete user "${profile.full_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First delete related data
              // Note: This assumes your database has proper cascade deletes or you need to handle these individually

              // Delete user profile
              const { error } = await supabase.from('profiles').delete().eq('id', profile.id);

              if (error) throw error;

              // Navigate back
              navigation.goBack();

              // Show confirmation
              Alert.alert('Success', 'User deleted by admin');
            } catch (err) {
              console.error('Admin delete user error:', err);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen>
        <Header title={t('profile.loading') || 'Loading...'} showBack />
        <YStack f={1} jc="center" ai="center">
          <Text>{t('profile.loading') || 'Loading profile data...'}</Text>
        </YStack>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen>
        <Header title={t('profile.error') || 'Error'} showBack />
        <YStack f={1} jc="center" ai="center" padding="$4">
          <Text color="$red10">{error || t('profile.notFound') || 'Profile not found'}</Text>
          <Button
            onPress={() => navigation.goBack()}
            marginTop="$4"
            icon={<Feather name="arrow-left" size={18} color="white" />}
            variant="primary"
            size="$4"
          >
            {t('common.goBack') || 'Go Back'}
          </Button>
        </YStack>
      </Screen>
    );
  }

  // Helper function to format driving time
  const formatDrivingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <Screen scroll padding={false}>
      <Header
        title={profile.full_name || t('profile.user') || 'User'}
        showBack
        rightElement={
          <>
            {showAdminControls && (
              <Button
                onPress={handleAdminDeleteUser}
                icon={<Feather name="trash-2" size={20} color="red" />}
                variant="secondary"
                marginRight="$2"
              >
                {t('profile.adminDelete') || 'Delete User'}
              </Button>
            )}
            {isCurrentUser ? (
              <ProfileButton userId={profile.id} isCurrentUser={true} size="sm" />
            ) : (
              <XStack gap="$1" flexWrap="wrap" maxWidth={windowWidth * 0.6}>
                {/* Follow/Unfollow Button */}
                <Button
                  onPress={handleFollow}
                  disabled={followLoading}
                  variant={isFollowing ? 'secondary' : 'primary'}
                  backgroundColor={isFollowing ? '$red5' : '$blue10'}
                  size="sm"
                  flexShrink={1}
                >
                  <XStack gap="$1" alignItems="center">
                    {followLoading ? (
                      <Text color={isFollowing ? '$red11' : 'white'} fontSize="$3">
                        {t('profile.loading') || '...'}
                      </Text>
                    ) : (
                      <>
                        <Feather
                          name={isFollowing ? 'user-minus' : 'user-plus'}
                          size={14}
                          color={isFollowing ? '#EF4444' : 'white'}
                        />
                        <Text
                          color={isFollowing ? '$red11' : 'white'}
                          fontSize="$2"
                          fontWeight="500"
                        >
                          {isFollowing
                            ? t('profile.unfollow') || 'Unfollow'
                            : t('profile.follow') || 'Follow'}
                        </Text>
                      </>
                    )}
                  </XStack>
                </Button>

                {/* Instructor/Student Relationship Button */}
                {currentUserProfile && (
                  <>
                    {/* Show Set as Instructor button for instructor/admin/school users viewing student profiles */}
                    {['instructor', 'admin', 'school'].includes(currentUserProfile.role) && 
                     profile?.role === 'student' && (
                      <Button
                        onPress={handleStudentToggle}
                        disabled={relationshipLoading}
                        variant={isStudent ? 'secondary' : 'primary'}
                        backgroundColor={isStudent ? '$orange5' : '$green10'}
                        size="sm"
                        flexShrink={1}
                      >
                        <XStack gap="$1" alignItems="center">
                          {relationshipLoading ? (
                            <Text color={isStudent ? '$orange11' : 'white'} fontSize="$3">
                              ...
                            </Text>
                          ) : (
                            <>
                              <Feather
                                name={isStudent ? 'user-x' : 'user-check'}
                                size={14}
                                color={isStudent ? '#F97316' : 'white'}
                              />
                              <Text
                                color={isStudent ? '$orange11' : 'white'}
                                fontSize="$2"
                                fontWeight="500"
                              >
                                {isStudent ? 'Unset as Student' : 'Set as Student'}
                              </Text>
                            </>
                          )}
                        </XStack>
                      </Button>
                    )}
                    
                    {/* Show Set as Instructor button for student users viewing instructor profiles */}
                    {currentUserProfile.role === 'student' && 
                     ['instructor', 'admin', 'school'].includes(profile?.role || '') && (
                      <Button
                        onPress={handleInstructorToggle}
                        disabled={relationshipLoading}
                        variant={isInstructor ? 'secondary' : 'primary'}
                        backgroundColor={isInstructor ? '$purple5' : '$blue10'}
                        size="sm"
                        flexShrink={1}
                      >
                        <XStack gap="$1" alignItems="center">
                          {relationshipLoading ? (
                            <Text color={isInstructor ? '$purple11' : 'white'} fontSize="$3">
                              ...
                            </Text>
                          ) : (
                            <>
                              <Feather
                                name={isInstructor ? 'user-x' : 'user-check'}
                                size={14}
                                color={isInstructor ? '#A855F7' : 'white'}
                              />
                              <Text
                                color={isInstructor ? '$purple11' : 'white'}
                                fontSize="$2"
                                fontWeight="500"
                              >
                                {isInstructor ? 'Unset as Instructor' : 'Set as Instructor'}
                              </Text>
                            </>
                          )}
                        </XStack>
                      </Button>
                    )}
                  </>
                )}

                {/* Message Button */}
                <Button
                  onPress={handleMessage}
                  icon={<Feather name="message-circle" size={14} color="white" />}
                  variant="primary"
                  backgroundColor="$green10"
                  size="sm"
                  flexShrink={1}
                >
                  <Text color="white" fontSize="$2" fontWeight="500">
                    {t('profile.message') || 'Message'}
                  </Text>
                </Button>

                {/* Share Button */}
                <Button
                  onPress={handleShare}
                  icon={<Feather name="share" size={14} color={iconColor} />}
                  variant="secondary"
                  size="sm"
                  flexShrink={1}
                />

                {/* Report Button */}
                <Button
                  onPress={handleReport}
                  icon={<Feather name="flag" size={14} color={iconColor} />}
                  variant="secondary"
                  size="sm"
                  flexShrink={1}
                />
              </XStack>
            )}
          </>
        }
      />

      <YStack padding="$4" gap="$4" paddingBottom="$8">
        {/* Profile header with avatar */}
        <YStack alignItems="center" gap="$2">
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 120, height: 120, borderRadius: 60 }}
            />
          ) : (
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#444',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="user" size={60} color="#ddd" />
            </View>
          )}

          <Text fontSize="$6" fontWeight="bold">
            {profile.full_name || t('profile.unnamed')}
          </Text>

          {profile.location && (
            <XStack alignItems="center" gap="$1">
              <Feather name="map-pin" size={16} color={iconColor} />
              <Text>{profile.location}</Text>
            </XStack>
          )}

          {profile.role && (
            <Card padding="$2" marginTop="$2" backgroundColor="$blue5" borderRadius="$4">
              <Text color="$blue11" fontWeight="500">
                {profile.role === 'student'
                  ? t('profile.roles.student') || 'Student'
                  : profile.role === 'instructor'
                    ? t('profile.roles.instructor') || 'Instructor'
                    : t('profile.roles.school') || 'School'}
              </Text>
            </Card>
          )}
        </YStack>

        {/* Stats Grid - 2x3 layout with driving stats */}
        <Card padding="$4" bordered>
          <YStack gap="$4">
            {/* First row */}
            <XStack justifyContent="space-between">
              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {profile.routes_created}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.routesCreated') || 'Routes Created'}
                </Text>
              </YStack>

              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {profile.routes_driven}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.routesDriven') || 'Routes Driven'}
                </Text>
              </YStack>

              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {profile.routes_saved}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.routesSaved') || 'Routes Saved'}
                </Text>
              </YStack>
            </XStack>

            {/* Second row */}
            <XStack justifyContent="space-around">
              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {profile.reviews_given}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.reviewsGiven') || 'Reviews Given'}
                </Text>
              </YStack>

              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {profile.average_rating.toFixed(1)}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.avgRating') || 'Avg Rating'}
                </Text>
              </YStack>

              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$green10">
                  {profile.total_distance_driven.toFixed(1)}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.kmDriven') || 'km Driven'}
                </Text>
              </YStack>
            </XStack>

            {/* Third row - Follow Stats */}
            <XStack justifyContent="space-around">
              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$blue10">
                  {followersCount}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.followers') || 'Followers'}
                </Text>
              </YStack>

              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$blue10">
                  {followingCount}
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('profile.following') || 'Following'}
                </Text>
              </YStack>

              {/* Empty space for alignment */}
              <YStack alignItems="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" opacity={0}>
                  -
                </Text>
                <Text fontSize="$3" color="$gray11" textAlign="center" opacity={0}>
                  -
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>

        {/* Driving Statistics Card - Additional detailed stats */}
        {(profile.recorded_routes_created > 0 || profile.total_distance_driven > 0) && (
          <Card padding="$4" bordered backgroundColor="$green1">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Feather name="activity" size={20} color="#22C55E" />
                <Text fontSize="$5" fontWeight="bold" color="$green11">
                  {t('profile.drivingStats') || 'Driving Statistics'}
                </Text>
              </XStack>

              <XStack justifyContent="space-around">
                <YStack alignItems="center" flex={1}>
                  <Text fontSize="$5" fontWeight="bold" color="$green11">
                    {profile.recorded_routes_created}
                  </Text>
                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    {t('profile.recordedRoutes') || 'Recorded Routes'}
                  </Text>
                </YStack>

                <YStack alignItems="center" flex={1}>
                  <Text fontSize="$5" fontWeight="bold" color="$green11">
                    {profile.total_distance_driven.toFixed(1)} km
                  </Text>
                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    {t('profile.totalDistance') || 'Total Distance'}
                  </Text>
                </YStack>

                <YStack alignItems="center" flex={1}>
                  <Text fontSize="$5" fontWeight="bold" color="$green11">
                    {formatDrivingTime(profile.total_duration_driven)}
                  </Text>
                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    {t('profile.drivingTime') || 'Driving Time'}
                  </Text>
                </YStack>
              </XStack>

              <Text fontSize="$2" color="$gray9" textAlign="center" fontStyle="italic">
                {t('profile.fromRecordedRoutes') || 'Based on GPS-recorded routes only'}
              </Text>
            </YStack>
          </Card>
        )}

        {/* Learning path progress */}
        {profile.role === 'student' && (
          <Card padding="$4" bordered>
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$5" fontWeight="bold">
                  {t('profile.learningPath') || 'Learning Path'}
                </Text>
                <Button
                  size="sm"
                  variant="outlined"
                  onPress={() => navigation.navigate('ProgressTab', { showDetail: true })}
                >
                  {t('profile.viewDetails') || 'View Details'}
                </Button>
              </XStack>

              <YStack gap="$2">
                <XStack justifyContent="space-between">
                  <Text>{t('profile.learningProgress') || 'Progress'}</Text>
                  <Text>
                    {learningPathSteps.completed}/{learningPathSteps.total} (
                    {Math.round((learningPathSteps.completed / learningPathSteps.total) * 100)}%)
                  </Text>
                </XStack>

                <View
                  style={{
                    height: 8,
                    backgroundColor: '#eee',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${(learningPathSteps.completed / learningPathSteps.total) * 100}%`,
                      backgroundColor: '#34C759',
                    }}
                  />
                </View>

                {learningPathSteps.currentTitle && (
                  <XStack alignItems="center" gap="$2">
                    <Feather name="bookmark" size={14} color={iconColor} />
                    <Text fontSize="$3" color="$gray11">
                      {t('profile.currentStep') || 'Current step'}: {learningPathSteps.currentTitle}
                    </Text>
                  </XStack>
                )}

                <Text fontSize="$3" color="$gray11">
                  {t('profile.learningPathNote') ||
                    `${learningPathSteps.completed} of ${learningPathSteps.total} steps completed. View details for more.`}
                </Text>

                {profile.experience_level && (
                  <XStack alignItems="center" gap="$2" marginTop="$2">
                    <Feather name="award" size={16} color={iconColor} />
                    <Text>
                      {profile.experience_level === 'beginner'
                        ? t('profile.experienceLevels.beginner') || 'Beginner'
                        : profile.experience_level === 'intermediate'
                          ? t('profile.experienceLevels.intermediate') || 'Intermediate'
                          : t('profile.experienceLevels.advanced') || 'Advanced'}
                    </Text>
                  </XStack>
                )}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Connections */}
        {(schools.length > 0 || supervisors.length > 0) && (
          <Card padding="$4" bordered>
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="bold">
                {t('profile.connections') || 'Connections'}
              </Text>

              {/* Schools */}
              {schools.length > 0 && (
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Feather name="home" size={16} color={iconColor} />
                    <Text fontWeight="500">{schools.length === 1 ? 'School:' : 'Schools:'}</Text>
                  </XStack>
                  {schools.map((school) => (
                    <XStack key={school.school_id} alignItems="center" gap="$2" paddingLeft="$6">
                      <Text>• {school.school_name}</Text>
                      {school.school_location && (
                        <Text color="$gray11" fontSize="$3">
                          ({school.school_location})
                        </Text>
                      )}
                    </XStack>
                  ))}
                </YStack>
              )}

              {/* Supervisors */}
              {supervisors.length > 0 && (
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Feather name="user-check" size={16} color={iconColor} />
                    <Text fontWeight="500">
                      {supervisors.length === 1 ? 'Supervisor:' : 'Supervisors:'}
                    </Text>
                  </XStack>
                  {supervisors.map((supervisor) => (
                    <XStack
                      key={supervisor.supervisor_id}
                      alignItems="center"
                      gap="$2"
                      paddingLeft="$6"
                    >
                      <Text>• {supervisor.supervisor_name}</Text>
                      {supervisor.supervisor_email && (
                        <Text color="$gray11" fontSize="$3">
                          ({supervisor.supervisor_email})
                        </Text>
                      )}
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>
          </Card>
        )}

        {/* Recent routes */}
        {recentRoutes.length > 0 && (
          <Card padding="$4" bordered>
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$5" fontWeight="bold">
                  {t('profile.recentRoutes') || 'Recent Routes'}
                </Text>

                <Button size="sm" variant="outlined" onPress={handleViewAllRoutes}>
                  {t('profile.viewAll') || 'View All'}
                </Button>
              </XStack>

              {recentRoutes.map((route) => (
                <Card
                  key={route.id}
                  padding="$3"
                  bordered
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
                  delayPressIn={50}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <YStack gap="$1">
                    <Text fontSize="$4" fontWeight="500">
                      {route.name}
                    </Text>

                    <XStack gap="$3">
                      <XStack alignItems="center" gap="$1">
                        <Feather name="bar-chart" size={14} color={iconColor} />
                        <Text fontSize="$3">{route.difficulty}</Text>
                      </XStack>

                      <XStack alignItems="center" gap="$1">
                        <Feather name="map-pin" size={14} color={iconColor} />
                        <Text fontSize="$3">{route.spot_type}</Text>
                      </XStack>
                    </XStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          </Card>
        )}

        {/* Recent reviews */}
        {recentReviews.length > 0 && (
          <Card padding="$4" bordered>
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="bold">
                {t('profile.recentReviews') || 'Recent Reviews'}
              </Text>

              {recentReviews.map((review) => (
                <Card
                  key={review.id}
                  padding="$3"
                  bordered
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$4" fontWeight="500">
                        {review.route?.name || 'Unknown Route'}
                      </Text>

                      <XStack alignItems="center" gap="$1">
                        <Feather name="star" size={16} color="#FFD700" />
                        <Text>{review.rating.toFixed(1)}</Text>
                      </XStack>
                    </XStack>

                    {review.content && (
                      <Text fontSize="$3" color="$gray11" numberOfLines={2}>
                        {review.content}
                      </Text>
                    )}
                  </YStack>
                </Card>
              ))}
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Report dialog */}
      {showReportDialog && (
        <ReportDialog
          reportableId={userId}
          reportableType="user"
          onClose={() => setShowReportDialog(false)}
        />
      )}
    </Screen>
  );
}
