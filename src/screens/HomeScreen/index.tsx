import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { FlatList, TouchableOpacity, Platform, Animated } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Screen } from '../../components/Screen';
import { OnboardingModalInteractive } from '../../components/OnboardingModalInteractive';
import {
  shouldShowInteractiveOnboarding,
  completeOnboardingWithVersion,
} from '../../components/OnboardingInteractive';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { useTour } from '../../contexts/TourContext';

import { UserListSheet } from '../../components/UserListSheet';
import { UserProfileSheet } from '../../components/UserProfileSheet';
import { RouteDetailSheet } from '../../components/RouteDetailSheet';
import { CommunityFeedSheet } from '../../components/CommunityFeedSheet';
import { MessagesSheet } from '../../components/MessagesSheet';
import { NotificationsSheet } from '../../components/NotificationsSheet';
// import { EventsSheet } from '../../components/EventsSheet';
import { ProfileSheet } from '../../components/ProfileSheet';
import { AchievementsSheet } from '../../components/AchievementsSheet';
import { HomeHeader } from './Header';
import { ScrollableHeader } from './ScrollableHeader';
import { AvatarModal } from './AvatarModal';
import { WelcomeText } from './WelcomeText';
import MyTab from './MyTab';
import CommunityTab from './CommunityTab';
import { useTourTarget } from '../../components/TourOverlay';

interface HomeScreenProps {
  activeUserId?: string;
}

export const HomeScreen = React.memo(function HomeScreen({ activeUserId }: HomeScreenProps = {}) {
  const { user, profile } = useAuth();
  const { isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const { t, language } = useTranslation();
  const tourContext = useTour();
  const { startDatabaseTour, shouldShowTour } = tourContext;

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Bottom inset for safe area (same as FilterSheet)
  const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

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
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showAchievementsSheet, setShowAchievementsSheet] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'you' | 'community'>('you');

  // Reduced logging to prevent console flooding

  // State declarations
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Scroll animation ref
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Performance monitoring
  React.useEffect(() => {
    console.log('⚡ [HomeScreen] Component mounted at:', new Date().toISOString());
    const startTime = Date.now();
    return () => {
      console.log('⚡ [HomeScreen] Component unmounted after:', Date.now() - startTime, 'ms');
    };
  }, []);
  
  // Track if UserListSheet was open when opening UserProfileSheet
  const wasUserListSheetOpenRef = React.useRef(false);
  
  // Register profile avatar for instructor tour targeting
  const profileAvatarRef = useTourTarget('Header.ProfileAvatar');

  // Onboarding logic - unified with OnboardingInteractive's storage system
  useEffect(() => {
    console.log('🎯 [HomeScreen] Checking onboarding');
    const checkFirstLogin = async () => {
      try {
        // Use the proper check that looks at both AsyncStorage AND user profile
        const shouldShow = await shouldShowInteractiveOnboarding(
          'interactive_onboarding',
          user?.id,
        );
        if (shouldShow && user?.id) {
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
    console.log('🎯 [HomeScreen] Checking tour');
    let isMounted = true;
    const checkTour = async () => {
      // Only show tour if user exists and no promotional modal
      if (user && isMounted) {
        const shouldShow = await shouldShowTour();

        if (shouldShow && isMounted) {
          // Start database tour after a delay to ensure UI is fully ready
          setTimeout(() => {
            // Double-check that no onboarding or promotional modal is showing and component is still mounted
            if (isMounted) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on data, not functions (functions should be stable from context)

  const handleRoutePress = React.useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    setShowRouteDetailSheet(true);
  }, []);

  // Listen for navigation focus to reopen RouteDetailSheet if needed
  useFocusEffect(
    useCallback(() => {
      // Check if we should reopen RouteDetailSheet after returning from AddReview
      console.log('🎯 [HomeScreen] Checking route detail sheet reopen');
      const routeParams = (navigation as any)
        ?.getState?.()
        ?.routes?.find((r: any) => r.name === 'HomeScreen')?.params;
      if (routeParams?.reopenRouteDetail && routeParams?.routeId) {
        setSelectedRouteId(routeParams.routeId);
        setShowRouteDetailSheet(true);

        // Clear the params to prevent reopening again
        navigation.setParams({ reopenRouteDetail: undefined, routeId: undefined });
      }
    }, [navigation]),
  );

  // Disabled to prevent console flooding
  // console.log('🎯 [HomeScreen] Rendering');

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
          }}
        />
      )}

      {/* Scrollable Header - positioned absolutely */}
      <ScrollableHeader
        scrollY={scrollY}
        onAvatarPress={() => setShowAvatarModal(true)}
        onNotificationPress={() => setShowNotificationsSheet(true)}
        onUsersPress={profile?.role === 'admin' ? () => setShowUserListSheet(true) : undefined}
        isAdmin={profile?.role === 'admin'}
        profileAvatarRef={profileAvatarRef}
      />

      <Animated.FlatList
        data={[1]}
        keyExtractor={() => 'home-content'}
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 + BOTTOM_INSET }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        renderItem={() => (
          <YStack f={1}>
            {/* Welcome Text - fades out on scroll */}
            <WelcomeText scrollY={scrollY} />

            {/* Tab Switcher */}
            {/* <XStack
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
            </XStack> */}

            {isViewingAsStudent && (
              <YStack
                backgroundColor="$blue3"
                padding="$2"
                marginHorizontal="$4"
                marginBottom="$2"
                borderRadius="$2"
              >
                <Text color="$blue11" textAlign="center">
                  {getTranslation(
                    'common.viewingAs',
                    language === 'sv' ? 'Visar som' : 'Viewing as'
                  )}
                  :{' '}
                  {activeStudentName ||
                    getTranslation('common.student', language === 'sv' ? 'Elev' : 'Student')}
                </Text>
              </YStack>
            )}

            {/* Content based on active tab */}
            {activeTab === 'you' ? (
              <MyTab
                activeUserId={activeUserId}
                handleRoutePress={handleRoutePress}
                setShowCommunityFeedSheet={setShowCommunityFeedSheet}
                setSelectedUserId={setSelectedUserId}
                setShowUserProfileSheet={setShowUserProfileSheet}
                setShowUserListSheet={setShowUserListSheet}
              />
            ) : (
              <CommunityTab
                handleRoutePress={handleRoutePress}
                setSelectedUserId={setSelectedUserId}
                setShowUserProfileSheet={setShowUserProfileSheet}
              />
            )}
          </YStack>
        )}
      />

      {/* User List Sheet */}
      <UserListSheet
        visible={showUserListSheet && !showUserProfileSheet} // Hide when UserProfileSheet is showing
        onClose={() => setShowUserListSheet(false)}
        title={t('home.users.allUsers') || 'All Users'}
        onUserPress={(userId) => {
          setSelectedUserId(userId);
          // Track that UserListSheet was open
          wasUserListSheetOpenRef.current = true;
          // Close UserListSheet when opening UserProfileSheet to avoid overlap
          setShowUserListSheet(false);
          setShowUserProfileSheet(true);
        }}
      />

      {/* User Profile Sheet */}
      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => {
          setShowUserProfileSheet(false);
          // Only reopen UserListSheet if it was open before
          if (wasUserListSheetOpenRef.current) {
            setShowUserListSheet(true);
            wasUserListSheetOpenRef.current = false; // Reset
          }
        }}
        userId={selectedUserId}
        onViewAllRoutes={(_userId) => {
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

      {/* Avatar Modal */}
      <AvatarModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onViewProfile={() => {
          setShowAvatarModal(false);
          setShowUserProfileSheet(true);
        }}
        onLogout={() => {
          // Logout is handled internally by AvatarModal
        }}
      />

      {/* Profile Sheet */}
      <ProfileSheet visible={showProfileSheet} onClose={() => setShowProfileSheet(false)} />

      {/* Achievements Sheet */}
      <AchievementsSheet
        visible={showAchievementsSheet}
        onClose={() => setShowAchievementsSheet(false)}
      />
    </Screen>
  );
});
