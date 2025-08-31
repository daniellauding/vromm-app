import React from 'react';
import { useState, useEffect } from 'react';
import { YStack, Text } from 'tamagui';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
// import { OnboardingModal } from '../../components/OnboardingModal';
import { OnboardingModalInteractive } from '../../components/OnboardingModalInteractive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { shouldShowInteractiveOnboarding } from '../../components/OnboardingInteractive';
import { useTranslation } from '../../contexts/TranslationContext';
import { useTour } from '../../contexts/TourContext';
import { ProgressSection } from '../../components/ProgressSection';
import { PromotionalModal, usePromotionalModal } from '../../components/PromotionalModal';
import type { FilterCategory } from '../../types/navigation';
import { SectionHeader } from '../../components/SectionHeader';
import { UsersList } from '../../components/UsersList';
import { HomeHeader } from './Header';
import { GettingStarted } from './GettingStarted';
import { SavedRoutes } from './SavedRoutes';
import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { CommunityFeed } from './CommunityFeed';

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
  const { user } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { startDatabaseTour, shouldShowTour } = useTour();
  const { showModal, modalContentType, setShowModal, checkForPromotionalContent } = usePromotionalModal();
  
  // Debug state for development
  const [showDebugOptions, setShowDebugOptions] = useState(false);

  // Use the effective user ID (either activeUserId prop, activeStudentId from context, or current user id)
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Debug logging for HomeScreen
  console.log('📱 [HomeScreen] Current user:', user?.id, user?.email);
  console.log('📱 [HomeScreen] Active user ID prop:', activeUserId);
  console.log('📱 [HomeScreen] Effective user ID:', effectiveUserId);
  console.log('📱 [HomeScreen] Is viewing as student:', isViewingAsStudent);
  console.log('📱 [HomeScreen] Active student name:', activeStudentName);

  // State declarations
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  
  // Debug state
  console.log('🎯 [HomeScreen] Current state:', {
    showOnboarding,
    isFirstLogin,
    hasUser: !!user,
    userId: user?.id
  });

  // Check if this is the first login and should show onboarding
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const key = 'vromm_first_login';
        const firstLoginValue = await AsyncStorage.getItem(key);
        
        // Debug: Log the actual value
        console.log('🎯 [HomeScreen] vromm_first_login value:', firstLoginValue);

        if (firstLoginValue === null) {
          // First time login detected
          console.log('🎯 [HomeScreen] FIRST LOGIN DETECTED - showing onboarding');
          setIsFirstLogin(true);
          setShowOnboarding(true);
          await AsyncStorage.setItem(key, 'false');
        } else {
          // Check if interactive onboarding should be shown (USER-BASED)
          const shouldShow = await shouldShowInteractiveOnboarding('interactive_onboarding', user.id);
          console.log('🎯 [HomeScreen] Should show interactive onboarding:', shouldShow);
          
          setShowOnboarding(shouldShow);
        }
      } catch (error) {
        console.error('🎯 [HomeScreen] Error checking first login status:', error);
        // Force show onboarding on error for debugging
        console.log('🎯 [HomeScreen] FORCING onboarding due to error');
        setShowOnboarding(true);
      }
    };

    if (user) {
      console.log('🎯 [HomeScreen] User detected, checking first login:', user.id);
      checkFirstLogin();
    } else {
      console.log('🎯 [HomeScreen] No user detected yet');
    }
  }, [user]);

  // Check if tour should be shown after onboarding is complete
  useEffect(() => {
    const checkTour = async () => {
      // Only show tour if user exists, onboarding is NOT showing, and no promotional modal
      if (user && !showOnboarding && !showModal) {
        console.log('🎯 [HomeScreen] Checking if tour should show...');
        const shouldShow = await shouldShowTour();
        console.log('🎯 [HomeScreen] Should show tour:', shouldShow);
        
        if (shouldShow) {
          console.log('🎯 [HomeScreen] Starting database tour...');
          // Start database tour after a longer delay to ensure UI is fully ready and no other modals are showing
          setTimeout(() => {
            // Double-check that no onboarding or promotional modal is showing
            if (!showModal && !showOnboarding) {
              console.log('🎯 [HomeScreen] All clear - starting tour now');
              startDatabaseTour();
            } else {
              console.log('🎯 [HomeScreen] Tour delayed - modal is showing:', { showModal, showOnboarding });
            }
          }, 2000); // 2 second delay after onboarding closes
        } else {
          console.log('🎯 [HomeScreen] Tour already completed, not showing');
        }
      } else {
        console.log('🎯 [HomeScreen] Tour check skipped:', { hasUser: !!user, showOnboarding, showModal });
      }
    };

    checkTour();
  }, [user, showOnboarding, showModal, shouldShowTour, startDatabaseTour]);

  // Retry tour when modal closes (onboarding or promotional)
  useEffect(() => {
    if (user && !showOnboarding && !showModal) {
      // If modal just closed, check if we should start the tour
      const retryTour = async () => {
        const shouldShow = await shouldShowTour();
        if (shouldShow) {
          console.log('🎯 [HomeScreen] Retrying tour after modal closed');
          setTimeout(() => {
            // Final check before starting tour
            if (!showModal && !showOnboarding) {
              console.log('🎯 [HomeScreen] Starting tour on retry');
              startDatabaseTour();
            }
          }, 1000);
        }
      };
      
      // Small delay to let modal close animation complete
      setTimeout(retryTour, 500);
    }
  }, [showModal, showOnboarding]); // Trigger when either modal state changes

  // Debug functions for testing onboarding
  const handleResetAllOnboarding = async () => {
    try {
      // Reset AsyncStorage flags
      await AsyncStorage.multiRemove([
        'interactive_onboarding',
        'vromm_first_login',
        'vromm_onboarding',
        'vromm_app_tour_completed',
        'promotional_modal_seen'
      ]);
      
      // Reset user's profile flags (USER-BASED)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            interactive_onboarding_completed: false,
            interactive_onboarding_version: null,
            tour_completed: false,
            tour_content_hash: null,
          })
          .eq('id', user.id);
          
        if (error) {
          console.error('Error resetting user profile flags:', error);
        } else {
          console.log('🎯 [HomeScreen] Reset user profile onboarding + tour flags for:', user.id);
        }
      }
      
      alert('All onboarding flags (device + user + promotional) reset. Refresh the screen to see onboarding.');
      // Force refresh the onboarding check
      if (user) {
        setIsFirstLogin(true);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding');
    }
  };

  const handleForceShowOnboarding = () => {
    setIsFirstLogin(true);
    setShowOnboarding(true);
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

  return (
    <Screen edges={[]} padding={false} hideStatusBar scroll={false}>
      {/* Interactive Onboarding Modal */}
      {/* Debug onboarding state */}
      {console.log('🎯 [HomeScreen] Rendering OnboardingModalInteractive:', {
        visible: showOnboarding,
        forceShow: isFirstLogin,
        component: 'OnboardingModalInteractive',
        user: !!user,
        userId: user?.id
      })}
      
      <OnboardingModalInteractive
        visible={showOnboarding}
        onClose={() => {
          console.log('🎯 [HomeScreen] Onboarding modal closed');
          setShowOnboarding(false);
        }}
        forceShow={isFirstLogin}
      />
      
      {/* Debug options for development */}
      {__DEV__ && (
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
                onPress={handleForceShowOnboarding}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Force Show Onboarding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#FF3B30', padding: 8, borderRadius: 4, marginBottom: 4 }}
                onPress={handleResetAllOnboarding}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Reset All Onboarding</Text>
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
            <GettingStarted />

            <ProgressSection activeUserId={effectiveUserId} />
            <DraftRoutes />
            <SavedRoutes />
            <CommunityFeed />
            <QuickFilters handleFilterPress={handleFilterPress} />
            <Button
              onPress={() => navigation.navigate('CreateRoute', {})}
              variant="primary"
              size="lg"
            >
              {t('home.createNewRoute')}
            </Button>
            <YStack gap="$4">
              <CityRoutes />
              <CreatedRoutes />
              <NearByRoutes />
              <DrivenRoutes />
            </YStack>
            <YStack gap="$4" marginTop="$6" marginBottom="$6">
              <SectionHeader
                title="Users"
                variant="chevron"
                onAction={() => navigation.navigate('UsersScreen')}
                actionLabel={t('common.seeAll')}
              />
              <UsersList />
            </YStack>
          </YStack>
        )}
      />
    </Screen>
  );
}
