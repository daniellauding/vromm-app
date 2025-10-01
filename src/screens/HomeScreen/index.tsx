import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { YStack, Text } from 'tamagui';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { OnboardingModalInteractive } from '../../components/OnboardingModalInteractive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
// shouldShowInteractiveOnboarding import removed
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
import { SavedRoutes } from './SavedRoutes';
// import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { CommunityFeed } from './CommunityFeed';
// import { UpcomingEvents } from './UpcomingEvents';
import { CommunicationTools } from './CommunicationTools';

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
  // const [showEventsSheet, setShowEventsSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  // Use the effective user ID (either activeUserId prop, activeStudentId from context, or current user id)
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Reduced logging to prevent console flooding

  // State declarations
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Onboarding logic
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
          setIsFirstLogin(true);
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    
    checkFirstLogin();
  }, []);

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
    await AsyncStorage.removeItem('hasSeenOnboarding');
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
        'vromm_app_tour_completed'
      ]);
      
      const storageState = values.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string | null>);
      
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
    const resetKey = (navigation as any)?.getState?.()?.routes?.find((r: any) => r.name === 'HomeScreen')?.params?.resetKey;
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
      const routeParams = (navigation as any)?.getState?.()?.routes?.find((r: any) => r.name === 'HomeScreen')?.params;
      if (routeParams?.reopenRouteDetail && routeParams?.routeId) {
        console.log('🎯 HomeScreen: Reopening RouteDetailSheet after AddReview - routeId:', routeParams.routeId);
        setSelectedRouteId(routeParams.routeId);
        setShowRouteDetailSheet(true);
        
        // Clear the params to prevent reopening again
        navigation.setParams({ reopenRouteDetail: undefined, routeId: undefined });
      }
    }, [navigation])
  );

  return (
    <Screen edges={[]} padding={false} hideStatusBar scroll={false}>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModalInteractive
          visible={showOnboarding}
          onClose={() => {
            setShowOnboarding(false);
            setIsFirstLogin(false);
            AsyncStorage.setItem('hasSeenOnboarding', 'true');
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
              <Text style={{ color: 'white', fontSize: 12, marginBottom: 8 }}>
                Debug Options
              </Text>
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
                    alert(result ? 'Promotional modal should show!' : 'No promotional content found');
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
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <YStack f={1}>
            <HomeHeader />
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
            
            {/* Weekly Goal Section */}
            <WeeklyGoal activeUserId={effectiveUserId || undefined} />
            <DailyStatus activeUserId={effectiveUserId || undefined} />
            
            {/* Jump Back In Section */}
            <JumpBackInSection activeUserId={effectiveUserId || undefined} />
            
            <GettingStarted />

            <CommunicationTools 
              onMessagePress={() => setShowMessagesSheet(true)}
              onNotificationPress={() => setShowNotificationsSheet(true)}
              onEventPress={() => setShowEventsSheet(true)}
            />

        {/* Featured Content */}
        {console.log('🎯 [HomeScreen] Rendering FeaturedContent component')}
        <FeaturedContent />

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
          console.log('🎯 HomeScreen: RouteDetailSheet closing - selectedRouteId:', selectedRouteId);
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
          console.log('🎯 HomeScreen: Reopening RouteDetailSheet - selectedRouteId:', selectedRouteId);
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
      <MessagesSheet
        visible={showMessagesSheet}
        onClose={() => setShowMessagesSheet(false)}
      />

      <NotificationsSheet
        visible={showNotificationsSheet}
        onClose={() => setShowNotificationsSheet(false)}
      />

      {/* <EventsSheet
        visible={showEventsSheet}
        onClose={() => setShowEventsSheet(false)}
      /> */}

      <ProfileSheet
        visible={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
      />
    </Screen>
  );
}
