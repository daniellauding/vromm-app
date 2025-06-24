import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, Alert, StyleSheet, useColorScheme, Dimensions } from 'react-native';
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

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  routes_created: number;
  routes_driven: number;
  routes_saved: number;
  reviews_given: number;
  average_rating: number;
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
  const { user } = useAuth();
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

  useEffect(() => {
    loadProfile();
  }, [userId, route.params?.refresh]);

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

      // Get counts
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
      ]);

      const reviewsWithRating = counts[4].data || [];
      const averageRating =
        reviewsWithRating.length > 0
          ? reviewsWithRating.reduce((sum: number, review: any) => sum + review.rating, 0) /
            reviewsWithRating.length
          : 0;

      // Create complete profile object
      const profileWithCounts = {
        ...data,
        routes_created: counts[0].count || 0,
        routes_driven: counts[1].count || 0,
        routes_saved: counts[2].count || 0,
        reviews_given: counts[3].count || 0,
        average_rating: averageRating,
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

  return (
    <Screen>
      <Header
        title={profile.full_name || t('profile.user') || 'User'}
        showBack
        rightElement={
          <>
            {showAdminControls && (
              <Button
                onPress={handleAdminDeleteUser}
                icon={<Feather name="trash-2" size={20} color="red" />}
                variant="outlined"
                marginRight="$2"
              >
                {t('profile.adminDelete') || 'Delete User'}
              </Button>
            )}
            {isCurrentUser ? (
              <ProfileButton userId={profile.id} isCurrentUser={true} size="sm" />
            ) : (
              <Button
                onPress={handleReport}
                icon={<Feather name="flag" size={20} color={iconColor} />}
                variant="outlined"
              >
                {t('profile.report') || 'Report'}
              </Button>
            )}
          </>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        <YStack padding="$4" gap="$4">
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

          {/* Stats row */}
          <Card padding="$4" bordered>
            <XStack justifyContent="space-between">
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">
                  {profile.routes_created}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  {t('profile.routesCreated') || 'Routes Created'}
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">
                  {profile.routes_driven}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  {t('profile.routesDriven') || 'Routes Driven'}
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">
                  {profile.reviews_given}
                </Text>
                <Text fontSize="$3" color="$gray11">
                  {t('profile.reviewsGiven') || 'Reviews'}
                </Text>
              </YStack>
            </XStack>
          </Card>

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
                        {t('profile.currentStep') || 'Current step'}:{' '}
                        {learningPathSteps.currentTitle}
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
          {profile.school && (
            <Card padding="$4" bordered>
              <YStack gap="$3">
                <Text fontSize="$5" fontWeight="bold">
                  {t('profile.connections') || 'Connections'}
                </Text>

                <XStack alignItems="center" gap="$2">
                  <Feather name="home" size={16} color={iconColor} />
                  <Text>{t('profile.enrolledAt') || 'Enrolled at'}: </Text>
                  <Text fontWeight="500">{profile.school.name}</Text>
                </XStack>
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
      </ScrollView>

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
