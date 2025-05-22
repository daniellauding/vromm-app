import React, { useEffect, useState } from 'react';
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
  
  // Get userId from route params
  const userId = route.params?.userId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  
  useEffect(() => {
    loadProfile();
  }, [userId]);
  
  // Check if this is the current user's profile
  useEffect(() => {
    if (user && profile) {
      setIsCurrentUser(user.id === profile.id);
    }
  }, [user, profile]);

  const loadProfile = async () => {
    if (!userId) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get profile data with counts - ensure proper field selection
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          id,
          license_plan_completed,
          license_plan_data,
          school:school_id(*)
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      
      // Get counts
      const counts = await Promise.all([
        // Count routes created
        supabase
          .from('routes')
          .select('id', { count: 'exact' })
          .eq('creator_id', userId),
        
        // Count routes driven
        supabase
          .from('driven_routes')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Count routes saved
        supabase
          .from('saved_routes')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Count reviews given
        supabase
          .from('route_reviews')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Average rating
        supabase
          .from('route_reviews')
          .select('rating')
          .eq('user_id', userId),
          
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
          .limit(3)
      ]);
      
      const reviewsWithRating = counts[4].data || [];
      const averageRating = reviewsWithRating.length > 0
        ? reviewsWithRating.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewsWithRating.length
        : 0;
      
      // Create complete profile object
      const profileWithCounts = {
        ...data,
        routes_created: counts[0].count || 0,
        routes_driven: counts[1].count || 0,
        routes_saved: counts[2].count || 0,
        reviews_given: counts[3].count || 0,
        average_rating: averageRating
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
    navigation.navigate('Routes', { creatorId: userId });
  };
  
  const handleReport = () => {
    setShowReportDialog(true);
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
          isCurrentUser ? (
            <ProfileButton 
              userId={profile.id} 
              isCurrentUser={true} 
              size="sm"
            />
          ) : (
            <Button
              onPress={handleReport}
              icon={<Feather name="flag" size={20} color={iconColor} />}
              variant="outlined"
            >
              {t('profile.report') || 'Report'}
            </Button>
          )
        }
      />
      
      <ScrollView>
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
                  justifyContent: 'center' 
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
                <Text fontSize="$6" fontWeight="bold">{profile.routes_created}</Text>
                <Text fontSize="$3" color="$gray11">{t('profile.routesCreated') || 'Routes Created'}</Text>
              </YStack>
              
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">{profile.routes_driven}</Text>
                <Text fontSize="$3" color="$gray11">{t('profile.routesDriven') || 'Routes Driven'}</Text>
              </YStack>
              
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">{profile.reviews_given}</Text>
                <Text fontSize="$3" color="$gray11">{t('profile.reviewsGiven') || 'Reviews'}</Text>
              </YStack>
            </XStack>
          </Card>
          
          {/* Learning path progress */}
          {profile.role === 'student' && (
            <Card padding="$4" bordered>
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="bold">{t('profile.learningPath') || 'Learning Path'}</Text>
                
                <YStack gap="$2">
                  <XStack justifyContent="space-between">
                    <Text>{t('profile.learningProgress') || 'Progress'}</Text>
                    <Text>{profile.license_plan_completed === true ? '100%' : '0%'}</Text>
                  </XStack>
                  
                  <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                    <View 
                      style={{ 
                        height: '100%', 
                        width: profile.license_plan_completed === true ? '100%' : '0%', 
                        backgroundColor: '#34C759' 
                      }} 
                    />
                  </View>
                </YStack>
                
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
            </Card>
          )}
          
          {/* Connections */}
          {profile.school && (
            <Card padding="$4" bordered>
              <YStack gap="$3">
                <Text fontSize="$5" fontWeight="bold">{t('profile.connections') || 'Connections'}</Text>
                
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
                  <Text fontSize="$5" fontWeight="bold">{t('profile.recentRoutes') || 'Recent Routes'}</Text>
                  
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
                  >
                    <YStack gap="$1">
                      <Text fontSize="$4" fontWeight="500">{route.name}</Text>
                      
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
                <Text fontSize="$5" fontWeight="bold">{t('profile.recentReviews') || 'Recent Reviews'}</Text>
                
                {recentReviews.map((review) => (
                  <Card 
                    key={review.id} 
                    padding="$3" 
                    bordered
                  >
                    <YStack gap="$2">
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text fontSize="$4" fontWeight="500">{review.route?.name || 'Unknown Route'}</Text>
                        
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