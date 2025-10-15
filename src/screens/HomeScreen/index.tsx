import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { OnboardingModalInteractive } from '../../components/OnboardingModalInteractive';
import {
  shouldShowInteractiveOnboarding,
  completeOnboardingWithVersion,
} from '../../components/OnboardingInteractive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { useTour } from '../../contexts/TourContext';
import { ProgressSection } from '../../components/ProgressSection';
// Conditional tours still DISABLED to prevent flooding
// import { useConditionalTours } from '../../utils/conditionalTours';
import { PromotionalModal, usePromotionalModal } from '../../components/PromotionalModal';
import type { FilterCategory } from '../../types/navigation';
import { SectionHeader } from '../../components/SectionHeader';
import { UsersList } from '../../components/UsersList';
import { UserListSheet } from '../../components/UserListSheet';
import { UserProfileSheet } from '../../components/UserProfileSheet';
import { RouteDetailSheet } from '../../components/RouteDetailSheet';
import { CommunityFeedSheet } from '../../components/CommunityFeedSheet';
import { MessagesSheet } from '../../components/MessagesSheet';
import { NotificationsSheet } from '../../components/NotificationsSheet';
// import { EventsSheet } from '../../components/EventsSheet';
import { ProfileSheet } from '../../components/ProfileSheet';
import { HomeHeader } from './Header';
import { WeeklyGoal } from './WeeklyGoal';
import { DailyStatus } from './DailyStatus';
import { JumpBackInSection } from '../../components/JumpBackInSection';
import { GettingStarted } from './GettingStarted';
import { FeaturedContent } from './FeaturedContent';
import { FeaturedContent2 } from './FeaturedContent2';
import { SavedRoutes } from './SavedRoutes';
// import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { CommunityFeed } from './CommunityFeed';
import { Spinner } from 'tamagui';
import { Chip } from '../../components/Chip';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { Map } from '../../components/Map';
import { Play } from '@tamagui/lucide-icons';
import { formatDistanceToNow } from 'date-fns';
import { Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
// import { UpcomingEvents } from './UpcomingEvents';
// import { CommunicationTools } from './CommunicationTools';

// Update the Route type to include creator id
type Route = {
  id: string;
  name: string;
  description?: string;
  difficulty?: string;
  spot_type?: string;
  creator_id?: string;
  creator?: {
    id: string;
    full_name: string;
  };
  // Rest of the route properties...
};

interface HomeScreenProps {
  activeUserId?: string;
}

export function HomeScreen({ activeUserId }: HomeScreenProps = {}) {
  const { user, profile } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const tourContext = useTour();
  const { startDatabaseTour, shouldShowTour } = tourContext;
  // Conditional tours still DISABLED
  // const { triggerConditionalTour } = useConditionalTours();
  const { showModal, checkForPromotionalContent } = usePromotionalModal();

  // Debug state for development
  const [showDebugOptions, setShowDebugOptions] = useState(false);

  // Sheet states
  const [showUserListSheet, setShowUserListSheet] = useState(false);
  const [showUserProfileSheet, setShowUserProfileSheet] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showCommunityFeedSheet, setShowCommunityFeedSheet] = useState(false);

  // Communication sheet states
  const [showMessagesSheet, setShowMessagesSheet] = useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [showEventsSheet, setShowEventsSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  // Use the effective user ID (either activeUserId prop, activeStudentId from context, or current user id)
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Shared date state for WeeklyGoal and DailyStatus connection
  const [selectedDailyStatusDate, setSelectedDailyStatusDate] = useState(new Date());

  // Tab state
  const [activeTab, setActiveTab] = useState<'you' | 'community'>('you');

  // Reduced logging to prevent console flooding

  // State declarations
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Community feed state
  const [communityActivities, setCommunityActivities] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  // Onboarding logic - unified with OnboardingInteractive's storage system
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        // Use the proper check that looks at both AsyncStorage AND user profile
        const shouldShow = await shouldShowInteractiveOnboarding(
          'interactive_onboarding',
          user?.id,
        );
        if (shouldShow && user?.id) {
          console.log('🎯 [HomeScreen] Showing OnboardingInteractive for user:', user.id);
          setIsFirstLogin(true);
          setShowOnboarding(true);
        } else {
          console.log('🎯 [HomeScreen] User has completed onboarding, skipping');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    // Only check if we have a user
    if (user?.id) {
      checkFirstLogin();
    }
  }, [user?.id]);

  // Check if tour should be shown after onboarding is complete (RE-ENABLED for HomeScreen)
  useEffect(() => {
    let isMounted = true;

    const checkTour = async () => {
      // Only show tour if user exists and no promotional modal
      if (user && !showModal && isMounted) {
        const shouldShow = await shouldShowTour();

        if (shouldShow && isMounted) {
          // Start database tour after a delay to ensure UI is fully ready
          setTimeout(() => {
            // Double-check that no onboarding or promotional modal is showing and component is still mounted
            if (!showModal && isMounted) {
              startDatabaseTour('HomeScreen', profile?.role);
            }
          }, 2000);
        }
      }
    };

    // Add a small delay to prevent immediate execution on every render
    const timer = setTimeout(() => {
      if (isMounted) {
        checkTour();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user?.id, showModal, shouldShowTour, startDatabaseTour]); // Re-enabled dependencies

  // Retry tour when modal closes - consolidated with above effect to prevent conflicts

  // Conditional tours DISABLED to prevent console flooding
  // useEffect(() => {
  //   let isMounted = true;
  //   let timeoutId: NodeJS.Timeout;
  //
  //   const checkConditionalTours = async () => {
  //     try {
  //       if (user && !showOnboarding && !showModal && isMounted) {
  //         timeoutId = setTimeout(async () => {
  //           if (isMounted) {
  //             await triggerConditionalTour(user.id, tourContext, profile?.role || 'student');
  //           }
  //         }, 8000);
  //       }
  //     } catch (error) {
  //       console.error('Error checking conditional tours:', error);
  //     }
  //   };
  //
  //   checkConditionalTours();
  //
  //   return () => {
  //     isMounted = false;
  //     if (timeoutId) {
  //       clearTimeout(timeoutId);
  //     }
  //   };
  // }, [user?.id, showOnboarding, showModal]);

  // Debug functions for onboarding
  const resetOnboarding = async () => {
    // Reset unified onboarding system (AsyncStorage + user profile)
    await AsyncStorage.multiRemove([
      'interactive_onboarding',
      'hasSeenOnboarding', // Legacy key
    ]);

    // Reset user profile flags
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({
          interactive_onboarding_completed: false,
          interactive_onboarding_version: null,
        })
        .eq('id', user.id);
    }

    setShowOnboarding(true);
    setIsFirstLogin(true);
  };

  const showOnboardingDebug = () => {
    setShowOnboarding(true);
    setIsFirstLogin(true);
  };

  const handleCheckAsyncStorage = async () => {
    try {
      const values = await AsyncStorage.multiGet([
        'interactive_onboarding',
        'vromm_first_login',
        'vromm_onboarding',
        'vromm_app_tour_completed',
      ]);

      const storageState = values.reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string | null>,
      );

      console.log('🎯 [HomeScreen] AsyncStorage state:', storageState);
      alert(`AsyncStorage State:\n${JSON.stringify(storageState, null, 2)}`);
    } catch (error) {
      console.error('Error checking AsyncStorage:', error);
    }
  };

  const handleFilterPress = (filter: FilterCategory) => {
    navigation.navigate('RouteList', {
      title: `${filter.label} Routes`,
      routes: [], // Routes will be loaded in RouteList screen based on filter
      type: filter.type,
      activeFilter: filter,
    });
  };

  const handleRoutePress = (routeId: string) => {
    setSelectedRouteId(routeId);
    setShowRouteDetailSheet(true);
  };

  // Scroll to top and optionally trigger refresh when resetKey changes
  useEffect(() => {
    const resetKey = (navigation as any)
      ?.getState?.()
      ?.routes?.find((r: any) => r.name === 'HomeScreen')?.params?.resetKey;
    if (resetKey) {
      try {
        // Scroll FlatList to top by toggling key or using ref (here: key bump via state already supported by parent)
        console.log('[HomeScreen] resetKey detected → scroll to top');
      } catch {}
    }
  }, [navigation]);

  // Listen for navigation focus to reopen RouteDetailSheet if needed
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 HomeScreen: Screen focused');

      // Check if we should reopen RouteDetailSheet after returning from AddReview
      const routeParams = (navigation as any)
        ?.getState?.()
        ?.routes?.find((r: any) => r.name === 'HomeScreen')?.params;
      if (routeParams?.reopenRouteDetail && routeParams?.routeId) {
        console.log(
          '🎯 HomeScreen: Reopening RouteDetailSheet after AddReview - routeId:',
          routeParams.routeId,
        );
        setSelectedRouteId(routeParams.routeId);
        setShowRouteDetailSheet(true);

        // Clear the params to prevent reopening again
        navigation.setParams({ reopenRouteDetail: undefined, routeId: undefined });
      }
    }, [navigation]),
  );

  // Load community feed when Community tab is active
  useEffect(() => {
    if (activeTab === 'community') {
      loadFollowingUsers();
      loadCommunityFeed();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityFeed();
    }
  }, [communityFilter, followingUserIds, activeTab]);

  const loadFollowingUsers = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error && data) {
        setFollowingUserIds(data.map((f) => f.following_id));
      }
    } catch (error) {
      console.error('Error loading following users:', error);
    }
  };

  // Helper function to generate route media items
  const getRouteMediaItems = useCallback((route: any) => {
    const items = [];

    // Add map if waypoints exist
    const waypointsData = route.waypoint_details || route.metadata?.waypoints || [];
    if (waypointsData.length > 0) {
      const waypoints = waypointsData.map((wp: any) => ({
        latitude: Number(wp.lat),
        longitude: Number(wp.lng),
        title: wp.title?.toString(),
        description: wp.description?.toString(),
      }));

      const latitudes = waypoints.map((wp: any) => wp.latitude);
      const longitudes = waypoints.map((wp: any) => wp.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
      const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.01);
      const minDelta = 0.01;
      const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
      const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

      const region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      items.push({
        type: 'map' as const,
        data: {
          region,
          waypoints,
          routePath: waypoints.length > 2 ? waypoints : undefined,
          showStartEndMarkers: true,
          drawingMode: route.drawing_mode,
          penDrawingCoordinates: route.metadata?.coordinates || [],
        },
      });
    }

    // Add media attachments
    const mediaAttachmentsArray = Array.isArray(route.media_attachments)
      ? route.media_attachments
      : [];
    const validAttachments = mediaAttachmentsArray.filter(
      (m: any) =>
        m?.url &&
        (m.url.startsWith('http://') ||
          m.url.startsWith('https://') ||
          m.url.startsWith('file://') ||
          m.url.startsWith('data:') ||
          m.url.startsWith('content://')),
    );

    const media = validAttachments.map((m: any) => ({
      type: m.type,
      data: { url: m.url, description: m.description },
    }));

    return [...items, ...media];
  }, []);

  const loadCommunityFeed = async () => {
    try {
      setCommunityLoading(true);
      const feedItems: any[] = [];

      const shouldFilterByFollowing =
        communityFilter === 'following' && followingUserIds.length > 0;

      // Load recent public routes
      let routesQuery = supabase
        .from('routes')
        .select(
          `
          *,
          creator:profiles!routes_creator_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        routesQuery = routesQuery.in('creator_id', followingUserIds);
      }

      const { data: routes, error: routesError } = await routesQuery;

      if (!routesError && routes) {
        routes.forEach((route) => {
          if (route.creator) {
            feedItems.push({
              id: `route_${route.id}`,
              type: 'route_created',
              user: route.creator,
              created_at: route.created_at,
              data: route,
            });
          }
        });
      }

      // Load recent public events
      let eventsQuery = supabase
        .from('events')
        .select(
          `
          *,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        eventsQuery = eventsQuery.in('created_by', followingUserIds);
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (!eventsError && events) {
        events.forEach((event) => {
          if (event.creator) {
            feedItems.push({
              id: `event_${event.id}`,
              type: 'event_created',
              user: event.creator,
              created_at: event.created_at,
              data: event,
            });
          }
        });
      }

      // Load recent exercise completions
      let completionsQuery = supabase
        .from('virtual_repeat_completions')
        .select(
          `
          *,
          user:profiles!virtual_repeat_completions_user_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          learning_path_exercises(
            id,
            title,
            description,
            icon,
            image
          )
        `,
        )
        .order('completed_at', { ascending: false })
        .limit(50);

      if (shouldFilterByFollowing) {
        completionsQuery = completionsQuery.in('user_id', followingUserIds);
      }

      const { data: completions, error: completionsError } = await completionsQuery;

      if (!completionsError && completions) {
        completions.forEach((completion) => {
          if (completion.user && completion.learning_path_exercises) {
            feedItems.push({
              id: `completion_${completion.id}`,
              type: 'exercise_completed',
              user: completion.user,
              created_at: completion.completed_at,
              data: {
                exercise: completion.learning_path_exercises,
                completion: completion,
              },
            });
          }
        });
      }

      // Sort all activities by date
      feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setCommunityActivities(feedItems);
    } catch (error) {
      console.error('Error loading community feed:', error);
    } finally {
      setCommunityLoading(false);
    }
  };

  return (
    <Screen edges={[]} padding={false} hideStatusBar scroll={false}>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModalInteractive
          visible={showOnboarding}
          onClose={async () => {
            // Save completion using unified system (both AsyncStorage + user profile)
            await completeOnboardingWithVersion('interactive_onboarding', user?.id);
            setShowOnboarding(false);
            setIsFirstLogin(false);
          }}
        />
      )}

      {/* Debug options DISABLED to prevent console flooding */}
      {false && __DEV__ && (
        <>
          {/* Debug trigger - tap area in top-left corner */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 100,
              left: 20,
              width: 60,
              height: 60,
              zIndex: 1000,
              opacity: 0.1,
            }}
            onPress={() => setShowDebugOptions(!showDebugOptions)}
          />

          {/* Debug menu */}
          {showDebugOptions && (
            <View
              style={{
                position: 'absolute',
                top: 120,
                left: 20,
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                borderRadius: 8,
                zIndex: 1000,
                minWidth: 200,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, marginBottom: 8 }}>Debug Options</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#007AFF', padding: 8, borderRadius: 4, marginBottom: 4 }}
                onPress={handleCheckAsyncStorage}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Check AsyncStorage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#34C759', padding: 8, borderRadius: 4, marginBottom: 4 }}
                onPress={showOnboardingDebug}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Show Onboarding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#FF9500', padding: 8, borderRadius: 4, marginBottom: 4 }}
                onPress={resetOnboarding}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Reset Onboarding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#FF9500', padding: 8, borderRadius: 4, marginBottom: 4 }}
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem('promotional_modal_seen');
                    console.log('🎉 [HomeScreen] Cleared promotional_modal_seen flag');
                    const result = await checkForPromotionalContent('modal');
                    console.log('🎉 [HomeScreen] Force promotional check result:', result);
                    alert(
                      result ? 'Promotional modal should show!' : 'No promotional content found',
                    );
                  } catch (error) {
                    console.error('Error testing promotional modal:', error);
                    alert('Error testing promotional modal');
                  }
                }}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Test Promotional Modal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#8E8E93', padding: 8, borderRadius: 4 }}
                onPress={() => setShowDebugOptions(false)}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <FlatList
        data={[1]}
        keyExtractor={() => 'home-content'}
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <YStack f={1}>
            <HomeHeader />

            {/* Tab Switcher */}
            <XStack
              paddingHorizontal="$4"
              paddingVertical="$3"
              gap="$2"
              // borderBottomWidth={1}
              // borderBottomColor="rgba(255, 255, 255, 0.1)"
            >
              <TouchableOpacity
                onPress={() => setActiveTab('you')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: activeTab === 'you' ? 'rgba(0, 230, 195, 0.15)' : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    activeTab === 'you' ? 'rgba(0, 230, 195, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Text
                  textAlign="center"
                  fontWeight={activeTab === 'you' ? '700' : '500'}
                  color={activeTab === 'you' ? '$primary' : '$gray11'}
                  fontSize="$4"
                >
                  You
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('community')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === 'community' ? 'rgba(0, 230, 195, 0.15)' : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    activeTab === 'community'
                      ? 'rgba(0, 230, 195, 0.5)'
                      : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Text
                  textAlign="center"
                  fontWeight={activeTab === 'community' ? '700' : '500'}
                  color={activeTab === 'community' ? '$primary' : '$gray11'}
                  fontSize="$4"
                >
                  Community
                </Text>
              </TouchableOpacity>
            </XStack>

            {isViewingAsStudent && (
              <YStack
                backgroundColor="$blue3"
                padding="$2"
                marginHorizontal="$4"
                marginBottom="$2"
                borderRadius="$2"
              >
                <Text color="$blue11" textAlign="center">
                  Viewing as: {activeStudentName || 'Student'}
                </Text>
              </YStack>
            )}

            {/* Content based on active tab */}
            {activeTab === 'you' ? (
              <YStack>
                {/* Weekly Goal Section */}
                <WeeklyGoal
                  activeUserId={effectiveUserId || undefined}
                  selectedDate={selectedDailyStatusDate}
                  onDateSelected={(date: Date) => {
                    console.log(
                      '🗓️ [HomeScreen] Date selected from WeeklyGoal:',
                      date.toDateString(),
                    );
                    setSelectedDailyStatusDate(date);
                  }}
                />
                <DailyStatus
                  activeUserId={effectiveUserId || undefined}
                  selectedDate={selectedDailyStatusDate}
                  onDateChange={(date) => {
                    console.log(
                      '🗓️ [HomeScreen] Date changed from DailyStatus:',
                      date.toDateString(),
                    );
                    setSelectedDailyStatusDate(date);
                  }}
                />

                {/* Jump Back In Section */}
                <JumpBackInSection activeUserId={effectiveUserId || undefined} />

                <GettingStarted />

                {/* Featured Content */}
                <FeaturedContent />

                {/* Featured Content 2 - Card Layout */}
                <FeaturedContent2 />

                {/* <UpcomingEvents 
              onEventPress={(eventId) => {
                navigation.navigate('EventDetail', { eventId });
              }}
              onShowEventsSheet={() => setShowEventsSheet(true)}
            /> */}

                <ProgressSection activeUserId={effectiveUserId} />
                <DraftRoutes onRoutePress={handleRoutePress} />
                <SavedRoutes onRoutePress={handleRoutePress} />
                <CommunityFeed
                  onOpenFeedSheet={() => setShowCommunityFeedSheet(true)}
                  onUserPress={(userId) => {
                    setSelectedUserId(userId);
                    setShowUserProfileSheet(true);
                  }}
                  onRoutePress={handleRoutePress}
                />
                {/* <QuickFilters handleFilterPress={handleFilterPress} /> */}
                <Button
                  onPress={() => navigation.navigate('CreateRoute', {})}
                  variant="primary"
                  size="lg"
                >
                  {t('home.createNewRoute')}
                </Button>
                <YStack gap="$4">
                  <CityRoutes onRoutePress={handleRoutePress} />
                  <CreatedRoutes onRoutePress={handleRoutePress} />
                  <NearByRoutes onRoutePress={handleRoutePress} />
                  <DrivenRoutes onRoutePress={handleRoutePress} />
                </YStack>
                <YStack gap="$4" marginTop="$6" marginBottom="$6">
                  <SectionHeader
                    title="Users"
                    variant="chevron"
                    onAction={() => setShowUserListSheet(true)}
                    actionLabel={t('common.seeAll')}
                  />
                  <UsersList
                    onUserPress={(userId: string) => {
                      if (userId) {
                        setSelectedUserId(userId);
                        setShowUserProfileSheet(true);
                      }
                    }}
                  />
                </YStack>
              </YStack>
            ) : (
              <YStack paddingTop="$4" gap="$4">
                {/* Community Tab Content - Full vertical feed */}

                {/* Filter chips */}
                <XStack paddingHorizontal="$4" gap="$3">
                  <Chip
                    active={communityFilter === 'all'}
                    onPress={() => setCommunityFilter('all')}
                    icon="activity"
                  >
                    All Activity
                  </Chip>
                  <Chip
                    active={communityFilter === 'following'}
                    onPress={() => setCommunityFilter('following')}
                    icon="users"
                  >
                    Following ({followingUserIds.length})
                  </Chip>
                </XStack>

                {/* Activity list */}
                {communityLoading ? (
                  <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$8">
                    <Spinner size="large" color="$primary" />
                    <Text color="$gray11" marginTop="$4">
                      Loading community activity...
                    </Text>
                  </YStack>
                ) : communityActivities.length === 0 ? (
                  <YStack flex={1} justifyContent="center" alignItems="center" padding="$8">
                    <Feather
                      name={communityFilter === 'following' ? 'users' : 'activity'}
                      size={64}
                      color="$gray9"
                    />
                    <Text
                      fontSize={20}
                      fontWeight="600"
                      color="$gray11"
                      textAlign="center"
                      marginTop="$4"
                    >
                      {communityFilter === 'following'
                        ? 'No activity from people you follow'
                        : 'No community activity yet'}
                    </Text>
                    <Text fontSize={16} color="$gray9" textAlign="center" marginTop="$2">
                      {communityFilter === 'following'
                        ? "The people you follow haven't posted anything recently"
                        : 'Be the first to create routes, events, or complete exercises!'}
                    </Text>
                  </YStack>
                ) : (
                  <YStack gap="$4" paddingHorizontal="$4">
                    {communityActivities.map((activity) => {
                      // Get media items for this activity
                      const mediaItems =
                        activity.type === 'route_created' ? getRouteMediaItems(activity.data) : [];
                      const screenWidth = Dimensions.get('window').width;

                      return (
                        <YStack
                          key={activity.id}
                          backgroundColor="rgba(255, 255, 255, 0.05)"
                          borderRadius={12}
                          padding="$4"
                          gap="$4"
                          borderWidth={1}
                          borderColor="rgba(255, 255, 255, 0.1)"
                        >
                          {/* User info header */}
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedUserId(activity.user.id);
                              setShowUserProfileSheet(true);
                            }}
                          >
                            <XStack alignItems="center" gap="$3">
                              {activity.user.avatar_url ? (
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    backgroundColor: '#444',
                                  }}
                                >
                                  <ImageWithFallback
                                    source={{ uri: activity.user.avatar_url }}
                                    style={{ width: 40, height: 40 }}
                                    resizeMode="cover"
                                  />
                                </View>
                              ) : (
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#444',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Feather name="user" size={20} color="#ddd" />
                                </View>
                              )}

                              <YStack flex={1}>
                                <Text fontSize={16} fontWeight="600" color="$color">
                                  {activity.user.full_name}
                                </Text>
                                <XStack alignItems="center" gap={6}>
                                  <Feather
                                    name={
                                      activity.type === 'route_created'
                                        ? 'map'
                                        : activity.type === 'event_created'
                                          ? 'calendar'
                                          : 'check-circle'
                                    }
                                    size={14}
                                    color="$primary"
                                  />
                                  <Text fontSize={14} color="$gray11">
                                    {activity.type === 'route_created'
                                      ? 'created a route'
                                      : activity.type === 'event_created'
                                        ? 'created an event'
                                        : 'completed exercise'}
                                  </Text>
                                </XStack>
                              </YStack>

                              <Text fontSize={12} color="$gray9">
                                {formatDistanceToNow(new Date(activity.created_at), {
                                  addSuffix: true,
                                })}
                              </Text>
                            </XStack>
                          </TouchableOpacity>

                          {/* Media Preview */}
                          {mediaItems.length > 0 && (
                            <View style={{ height: 180, borderRadius: 12, overflow: 'hidden' }}>
                              {mediaItems[0].type === 'map' ? (
                                <Map
                                  waypoints={mediaItems[0].data.waypoints}
                                  region={mediaItems[0].data.region}
                                  scrollEnabled={false}
                                  zoomEnabled={false}
                                  pitchEnabled={false}
                                  rotateEnabled={false}
                                  style={{ width: '100%', height: '100%' }}
                                  routePath={mediaItems[0].data.routePath}
                                  showStartEndMarkers={mediaItems[0].data.showStartEndMarkers}
                                  drawingMode={mediaItems[0].data.drawingMode}
                                  penDrawingCoordinates={mediaItems[0].data.penDrawingCoordinates}
                                />
                              ) : mediaItems[0].type === 'video' ? (
                                <TouchableOpacity
                                  style={{ width: '100%', height: '100%', position: 'relative' }}
                                  onPress={() =>
                                    console.log('🎥 Video play requested:', mediaItems[0].data.url)
                                  }
                                  activeOpacity={0.8}
                                >
                                  <View
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      backgroundColor: '#000',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <View
                                      style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        borderRadius: 40,
                                        width: 60,
                                        height: 60,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Play size={24} color="#FFF" />
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              ) : (
                                <ImageWithFallback
                                  source={{ uri: mediaItems[0].data.url }}
                                  style={{ width: '100%', height: '100%' }}
                                  resizeMode="cover"
                                />
                              )}
                            </View>
                          )}

                          {/* Activity content */}
                          {activity.type === 'route_created' && (
                            <TouchableOpacity onPress={() => handleRoutePress(activity.data.id)}>
                              <YStack gap="$2">
                                <Text fontSize={16} fontWeight="500" color="$color">
                                  {activity.data.name}
                                </Text>
                                <XStack gap="$4">
                                  <XStack alignItems="center" gap={4}>
                                    <Feather name="bar-chart" size={12} color="$gray11" />
                                    <Text fontSize={13} color="$gray11">
                                      {activity.data.difficulty}
                                    </Text>
                                  </XStack>
                                  <XStack alignItems="center" gap={4}>
                                    <Feather name="map-pin" size={12} color="$gray11" />
                                    <Text fontSize={13} color="$gray11">
                                      {activity.data.spot_type}
                                    </Text>
                                  </XStack>
                                </XStack>
                                {activity.data.description && (
                                  <Text fontSize={13} color="$gray10" numberOfLines={2}>
                                    {activity.data.description}
                                  </Text>
                                )}
                              </YStack>
                            </TouchableOpacity>
                          )}

                          {activity.type === 'event_created' && (
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('EventDetail', { eventId: activity.data.id })
                              }
                            >
                              <YStack gap="$2">
                                <Text fontSize={16} fontWeight="500" color="$color">
                                  {activity.data.title}
                                </Text>
                                <XStack alignItems="center" gap={4}>
                                  <Feather name="calendar" size={12} color="$gray11" />
                                  <Text fontSize={13} color="$gray11">
                                    {activity.data.event_date
                                      ? new Date(activity.data.event_date).toLocaleDateString()
                                      : 'No date set'}
                                  </Text>
                                </XStack>
                                {activity.data.description && (
                                  <Text fontSize={13} color="$gray10" numberOfLines={2}>
                                    {activity.data.description}
                                  </Text>
                                )}
                              </YStack>
                            </TouchableOpacity>
                          )}

                          {activity.type === 'exercise_completed' && (
                            <TouchableOpacity
                              onPress={() => {
                                navigation.navigate('RouteExercise', {
                                  routeId: '',
                                  exercises: [activity.data.exercise],
                                  routeName: 'Exercise',
                                  startIndex: 0,
                                });
                              }}
                            >
                              <YStack gap="$2">
                                <Text fontSize={16} fontWeight="500" color="$color">
                                  {activity.data.exercise.title?.en ||
                                    activity.data.exercise.title?.sv ||
                                    'Exercise'}
                                </Text>
                                <XStack alignItems="center" gap={4}>
                                  <Feather name="check-circle" size={12} color="$green9" />
                                  <Text fontSize={13} color="$green9">
                                    Exercise Completed
                                  </Text>
                                </XStack>
                                {activity.data.exercise.description && (
                                  <Text fontSize={13} color="$gray10" numberOfLines={2}>
                                    {activity.data.exercise.description?.en ||
                                      activity.data.exercise.description?.sv}
                                  </Text>
                                )}
                              </YStack>
                            </TouchableOpacity>
                          )}
                        </YStack>
                      );
                    })}
                  </YStack>
                )}
              </YStack>
            )}
          </YStack>
        )}
      />

      {/* User List Sheet */}
      <UserListSheet
        visible={showUserListSheet}
        onClose={() => setShowUserListSheet(false)}
        title={t('home.users.allUsers') || 'All Users'}
        onUserPress={(userId) => {
          setSelectedUserId(userId);
          setShowUserListSheet(false);
          setShowUserProfileSheet(true);
        }}
      />

      {/* User Profile Sheet */}
      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => setShowUserProfileSheet(false)}
        userId={selectedUserId}
        onViewAllRoutes={(userId) => {
          // Close profile sheet and navigate to RouteList
          setShowUserProfileSheet(false);
          navigation.navigate('RouteList', {
            title: 'User Routes',
            routes: [], // Routes will be loaded in RouteListScreen based on type
            type: 'created',
          });
        }}
      />

      {/* Route Detail Sheet */}
      <RouteDetailSheet
        visible={showRouteDetailSheet}
        onClose={() => {
          console.log(
            '🎯 HomeScreen: RouteDetailSheet closing - selectedRouteId:',
            selectedRouteId,
          );
          setShowRouteDetailSheet(false);
          // Don't clear selectedRouteId here to allow for reopening
        }}
        routeId={selectedRouteId}
        onStartRoute={(routeId) => {
          // Close sheet and navigate to map
          setShowRouteDetailSheet(false);
          (navigation as any).navigate('MainTabs', {
            screen: 'MapTab',
            params: { screen: 'MapScreen', params: { routeId } },
          });
        }}
        onNavigateToProfile={(userId) => {
          // Close route sheet and open user profile sheet
          setShowRouteDetailSheet(false);
          setSelectedUserId(userId);
          setShowUserProfileSheet(true);
        }}
        onReopen={() => {
          console.log(
            '🎯 HomeScreen: Reopening RouteDetailSheet - selectedRouteId:',
            selectedRouteId,
          );
          if (selectedRouteId) {
            setShowRouteDetailSheet(true);
          } else {
            console.warn('🎯 HomeScreen: No selectedRouteId, cannot reopen RouteDetailSheet');
          }
        }}
      />

      {/* Community Feed Sheet */}
      <CommunityFeedSheet
        visible={showCommunityFeedSheet}
        onClose={() => setShowCommunityFeedSheet(false)}
        onUserPress={(userId) => {
          // Close community feed sheet and open user profile sheet
          setShowCommunityFeedSheet(false);
          setSelectedUserId(userId);
          setShowUserProfileSheet(true);
        }}
        onRoutePress={(routeId) => {
          // Close community feed sheet and open route detail sheet
          setShowCommunityFeedSheet(false);
          setSelectedRouteId(routeId);
          setShowRouteDetailSheet(true);
        }}
        onEventPress={(eventId) => {
          // Close community feed sheet and navigate to event detail
          setShowCommunityFeedSheet(false);
          navigation.navigate('EventDetail', { eventId });
        }}
      />

      {/* Communication Sheets */}
      <MessagesSheet visible={showMessagesSheet} onClose={() => setShowMessagesSheet(false)} />

      <NotificationsSheet
        visible={showNotificationsSheet}
        onClose={() => setShowNotificationsSheet(false)}
      />

      {/* <EventsSheet
        visible={showEventsSheet}
        onClose={() => setShowEventsSheet(false)}
      /> */}

      <ProfileSheet visible={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
    </Screen>
  );
}
