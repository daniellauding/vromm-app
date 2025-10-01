import React, { useState, useCallback, useEffect, useRef } from 'react';
import { YStack, XStack, Switch, useTheme, Card, Input, TextArea } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { Database } from '../lib/database.types';
import * as Location from 'expo-location';
import {
  Alert,
  Modal,
  View,
  Pressable,
  Image,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { Header } from '../components/Header';
import { getTabContentPadding } from '../utils/layout';
import { useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { OnboardingModal } from '../components/OnboardingModal';
import { OnboardingModalInteractive } from '../components/OnboardingModalInteractive';
import { resetOnboarding } from '../components/Onboarding';
import { resetOnboardingForCurrentUser } from '../services/onboardingService';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { forceRefreshTranslations, debugTranslations } from '../services/translationService';
import { useTranslation } from '../contexts/TranslationContext';
import { useTour } from '../contexts/TourContext';
import { useLocation } from '../context/LocationContext';
import { useToast } from '../contexts/ToastContext';
import { usePromotionalModal } from '../components/PromotionalModal';
import { LockModal, useLockModal } from '../components/LockModal';
import { Language } from '../contexts/TranslationContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Popover from 'react-native-popover-view';
import { Platform, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { inviteNewUser, inviteMultipleUsers, inviteUsersWithPasswords, getPendingInvitations, cancelInvitation, resendInvitation } from '../services/invitationService_v2';
import * as FileSystem from 'expo-file-system';
import { RadioButton, DropdownButton } from '../components/SelectButton';
import { RelationshipManagementModal } from '../components/RelationshipManagementModal';

import { RelationshipReviewSection } from '../components/RelationshipReviewSection';
import { RelationshipReviewModal } from '../components/RelationshipReviewModal';
import { ProfileRatingBadge } from '../components/ProfileRatingBadge';
import { RelationshipReviewService } from '../services/relationshipReviewService';
import { useScreenLogger } from '../hooks/useScreenLogger';
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';
import {
  monitorDatabaseCall,
  monitorNetworkCall,
  checkMemoryUsage,
  checkForPotentialIssues,
  getPerformanceSummary,
} from '../utils/performanceMonitor';
import { pushNotificationService } from '../services/pushNotificationService';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { BarChart } from 'react-native-chart-kit';

import { format, startOfWeek, eachDayOfInterval, endOfWeek, parseISO, getDay } from 'date-fns';

type ExperienceLevel = Database['public']['Enums']['experience_level'];
type UserRole = Database['public']['Enums']['user_role'];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const USER_ROLES: UserRole[] = ['student', 'instructor', 'school'];
const LANGUAGES: Language[] = ['en', 'sv'];
const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  sv: 'Svenska',
};

// Add stats interfaces
interface DayStats {
  day: string;
  dayIndex: number;
  distance: number; // in km
  time: number; // in minutes
  routes: number;
}

interface DrivingStats {
  weeklyData: DayStats[];
  totalDistance: number;
  totalTime: number;
  totalRoutes: number;
  mostActiveDay: string;
  averagePerDay: {
    distance: number;
    time: number;
  };
}

// Custom bar chart component
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  maxValue?: number;
  unit?: string;
  showValues?: boolean;
}

const CustomBarChart = ({
  data,
  height = 120,
  maxValue,
  unit = '',
  showValues = true,
}: BarChartProps) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80; // Account for padding
  const barWidth = (chartWidth - 60) / data.length; // Space for labels
  const actualMaxValue = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={chartWidth} height={height + 40}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <Line
            key={index}
            x1={30}
            y1={10 + (height - 20) * ratio}
            x2={chartWidth - 10}
            y2={10 + (height - 20) * ratio}
            stroke="#333"
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = actualMaxValue > 0 ? (item.value / actualMaxValue) * (height - 20) : 0;
          const x = 30 + index * barWidth + (barWidth - Math.min(barWidth * 0.8, 40)) / 2;
          const barWidthActual = Math.min(barWidth * 0.8, 40);

          return (
            <React.Fragment key={index}>
              {/* Bar */}
              <Rect
                x={x}
                y={height - 10 - barHeight}
                width={barWidthActual}
                height={barHeight}
                fill={item.color || '#00E6C3'}
                rx={2}
              />

              {/* Value label on top of bar */}
              {showValues && item.value > 0 && (
                <SvgText
                  x={x + barWidthActual / 2}
                  y={height - 15 - barHeight}
                  fontSize="10"
                  fill="#fff"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.value.toFixed(item.value < 10 ? 1 : 0)}
                  {unit}
                </SvgText>
              )}

              {/* Day label */}
              <SvgText
                x={x + barWidthActual / 2}
                y={height + 15}
                fontSize="11"
                fill="#888"
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, index) => (
          <SvgText
            key={index}
            x={25}
            y={15 + (height - 20) * (1 - ratio)}
            fontSize="9"
            fill="#666"
            textAnchor="end"
          >
            {(actualMaxValue * ratio).toFixed(0)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

// Consolidated styles for ProfileScreen
const styles = StyleSheet.create({
  sheetOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
});

export function ProfileScreen() {
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const { resetTour, startDatabaseTour } = useTour();
  const { setUserLocation } = useLocation();
  const { checkForPromotionalContent } = usePromotionalModal();
  const { showToast } = useToast();
  
  // Lock modal state
  const {
    showModal: showLockModal,
    modalContentType,
    featureName,
    showLockModal: showLockModalAction,
    hideLockModal,
  } = useLockModal();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  
  // Animated dots for "Detecting Location..."
  const [dotsCount, setDotsCount] = useState(0);
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteBackdropOpacity = useRef(new Animated.Value(0)).current;
  const deleteModalScale = useRef(new Animated.Value(0.8)).current;
  const [optDeletePrivate, setOptDeletePrivate] = useState(false);
  const [optDeletePublic, setOptDeletePublic] = useState(false);
  const [optDeleteEvents, setOptDeleteEvents] = useState(false);
  const [optDeleteExercises, setOptDeleteExercises] = useState(false);
  const [optDeleteReviews, setOptDeleteReviews] = useState(false);
  const [optTransferPublic, setOptTransferPublic] = useState(true);
  
  // Location autocomplete state
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'relationships' | 'billing'>('overview');
  
  const theme = useTheme();
  const navigation = useNavigation<RootStackNavigationProp>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [supervisors, setSupervisors] = useState<
    Array<{ supervisor_id: string; supervisor_name: string; supervisor_email: string; relationship_created?: string }>
  >([]);
  const [schools, setSchools] = useState<
    Array<{ school_id: string; school_name: string; school_location: string }>
  >([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [availableSupervisors, setAvailableSupervisors] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [availableSchools, setAvailableSchools] = useState<
    Array<{ id: string; name: string; location: string }>
  >([]);
  const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Student selector for teachers/instructors
  const [supervisedStudents, setSupervisedStudents] = useState<
    Array<{ id: string; full_name: string; email: string; relationship_created?: string }>
  >([]);
  const [availableStudents, setAvailableStudents] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  
  // Use StudentSwitchContext for managing active student
  const { activeStudentId, setActiveStudent, clearActiveStudent } = useStudentSwitch();

  // Unified relationship management modal
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

  // Invitation system states (keep for backward compatibility)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteType, setInviteType] = useState<'supervisor' | 'student' | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [invitePasswords, setInvitePasswords] = useState<string[]>([]); // NEW: Store passwords for each email
  const [inviteCustomMessage, setInviteCustomMessage] = useState(''); // Custom message for invitations
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showPendingInvites, setShowPendingInvites] = useState(false);

  // Avatar selection modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarBackdropOpacity = useRef(new Animated.Value(0)).current;
  const avatarSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Location selection modal animation refs
  const locationBackdropOpacity = useRef(new Animated.Value(0)).current;
  const locationSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Developer options modal state
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const developerBackdropOpacity = useRef(new Animated.Value(0)).current;
  const developerSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Role, Experience, Language modal animation refs
  const roleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const roleSheetTranslateY = useRef(new Animated.Value(300)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const experienceBackdropOpacity = useRef(new Animated.Value(0)).current;
  const experienceSheetTranslateY = useRef(new Animated.Value(300)).current;
  const languageBackdropOpacity = useRef(new Animated.Value(0)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Notification modal state and animation refs
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const notificationBackdropOpacity = useRef(new Animated.Value(0)).current;
  const notificationSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Theme modal state and animation refs
  const [showThemeModal, setShowThemeModal] = useState(false);
  const themeBackdropOpacity = useRef(new Animated.Value(0)).current;
  const themeSheetTranslateY = useRef(new Animated.Value(300)).current;



  // Körkortsplan modal state and animation refs
  const [showKorkortsplanModal, setShowKorkortsplanModal] = useState(false);
  const korkortsplanBackdropOpacity = useRef(new Animated.Value(0)).current;
  const korkortsplanSheetTranslateY = useRef(new Animated.Value(300)).current;

  // License plan form state (moved from LicensePlanScreen)
  const [targetDate, setTargetDate] = useState<Date | null>(() => {
    const planData = profile?.license_plan_data as any;
    if (planData?.target_date) {
      return new Date(planData.target_date);
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<string>('6months');
  const dateButtonRef = useRef<any>(null);
  const [hasTheory, setHasTheory] = useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_theory || false;
  });
  const [hasPractice, setHasPractice] = useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_practice || false;
  });
  const [previousExperience, setPreviousExperience] = useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.previous_experience || '';
  });
  const [specificGoals, setSpecificGoals] = useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.specific_goals || '';
  });

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Add driving stats state
  const [drivingStats, setDrivingStats] = useState<DrivingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Billing state
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  
  // Relationship reviews state
  const [userRating, setUserRating] = useState({ averageRating: 0, reviewCount: 0, canReview: false, alreadyReviewed: false });
  const [relationshipReviews, setRelationshipReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  
  // Removal review modal state
  const [showRemovalReviewModal, setShowRemovalReviewModal] = useState(false);
  const [removalTargetSupervisor, setRemovalTargetSupervisor] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Add comprehensive logging
  const { logAction, logAsyncAction, logRenderIssue, logMemoryWarning } = useScreenLogger({
    screenName: 'ProfileScreen',
    trackPerformance: true,
    trackMemory: true,
  });

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: (profile as any)?.preferred_city || profile?.location || '', // Check onboarding data first
    role: profile?.role || ('student' as UserRole),
    experience_level: profile?.experience_level || ('beginner' as ExperienceLevel),
    private_profile: profile?.private_profile || false,
    location_lat: (profile as any)?.preferred_city_coords?.latitude || profile?.location_lat || null,
    location_lng: (profile as any)?.preferred_city_coords?.longitude || profile?.location_lng || null,
    avatar_url: profile?.avatar_url || null,
  });

  // Update form data when profile changes (e.g., after onboarding completion)
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile?.full_name || '',
        location: (profile as any)?.preferred_city || profile?.location || '',
        role: profile?.role || ('student' as UserRole),
        experience_level: profile?.experience_level || ('beginner' as ExperienceLevel),
        private_profile: profile?.private_profile || false,
        location_lat: (profile as any)?.preferred_city_coords?.latitude || profile?.location_lat || null,
        location_lng: (profile as any)?.preferred_city_coords?.longitude || profile?.location_lng || null,
        avatar_url: profile?.avatar_url || null,
      });

      // Update license plan form data when profile changes
      const planData = profile.license_plan_data as any;
      if (planData?.target_date) {
        setTargetDate(new Date(planData.target_date));
      } else {
        setTargetDate(null);
      }
      setHasTheory(planData?.has_theory || false);
      setHasPractice(planData?.has_practice || false);
      setPreviousExperience(planData?.previous_experience || '');
      setSpecificGoals(planData?.specific_goals || '');
    }
  }, [profile]);


  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.signOutFailed') || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const SYSTEM_PROFILE_UUID = '22f2bccb-efb5-4f67-85fd-8078a25acebc';

  const handleConfirmDeleteAccount = async () => {
    try {
      if (!user?.id) return;
      
      console.log('🗑️ [DELETE_ACCOUNT] Starting delete process...');
      console.log('🗑️ [DELETE_ACCOUNT] User ID:', user.id);
      console.log('🗑️ [DELETE_ACCOUNT] Options:', {
        optDeletePrivate,
        optDeletePublic,
        optDeleteEvents,
        optDeleteExercises,
        optDeleteReviews,
        optTransferPublic,
        SYSTEM_PROFILE_UUID
      });
      
      const { data, error } = await supabase.rpc('process_user_account_deletion', {
        p_user_id: user.id,
        p_delete_private_routes: optDeletePrivate,
        p_delete_public_routes: optDeletePublic,
        p_delete_events: optDeleteEvents,
        p_delete_exercises: optDeleteExercises,
        p_delete_reviews: optDeleteReviews,
        p_transfer_public_to: optTransferPublic ? SYSTEM_PROFILE_UUID : null,
      });
      
      console.log('🗑️ [DELETE_ACCOUNT] RPC Result:', { data, error });
      
      if (error) {
        console.error('🗑️ [DELETE_ACCOUNT] RPC Error:', error);
        throw error;
      }
      
      if (data && !data.success) {
        console.error('🗑️ [DELETE_ACCOUNT] Function returned error:', data);
        throw new Error(data.message || 'Delete account failed');
      }
      
      console.log('🗑️ [DELETE_ACCOUNT] Account deletion successful:', data);

      await supabase.auth.signOut();
      showToast({
        title: t('deleteAccount.successTitle') || 'Account deleted',
        message: t('deleteAccount.successMessage') || 'Your account was deleted.',
        type: 'success'
      });
      hideDeleteSheet();
    } catch (err) {
      console.error('Delete account error:', err);
      showToast({
        title: t('errors.title') || 'Error',
        message: (err as any)?.message || t('errors.deleteAccountFailed') || 'Failed to delete account',
        type: 'error'
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const detectLocation = useCallback(async () => {
    let dotsInterval: NodeJS.Timeout | null = null;
    try {
      setLocationLoading(true);
      
      // Always try to detect location, even if city is already selected (allow override)
      
      // Start dots animation
      dotsInterval = setInterval(() => {
        setDotsCount(prev => (prev + 1) % 4); // 0, 1, 2, 3, then back to 0
      }, 500);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({
          title: t('errors.permissionDenied') || 'Permission denied',
          message: t('errors.enableLocationServices') || 'Please enable location services to use this feature',
          type: 'error'
        });
        setLocationLoading(false);
        return;
      }

      let location;
      try {
        location = await Location.getCurrentPositionAsync({});
      } catch (locationError) {
        console.log('📍 Location failed, using Lund, Sweden fallback');
        // Fallback location for simulator - Lund, Sweden (same as OnboardingInteractive)
        location = {
          coords: {
            latitude: 55.7047,
            longitude: 13.1910,
          },
        };
      }

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationString = [address.city, address.country]
        .filter(Boolean)
        .join(', ');

      console.log('📍 Location detected:', locationString, 'overriding existing:', formData.location);

      setFormData((prev) => ({
        ...prev,
        location: locationString, // This should override existing location
        location_lat: location.coords.latitude,
        location_lng: location.coords.longitude,
      }));

      // Auto-save detected location (save to both location and preferred_city fields)
      if (user) {
        try {
          await updateProfile({
            location: locationString,
            location_lat: location.coords.latitude,
            location_lng: location.coords.longitude,
          });
          console.log('✅ Location saved to profile:', locationString);
        } catch (error) {
          console.error('Error saving detected location:', error);
        }
      }

      // Update LocationContext as well
      await setUserLocation({
        name: locationString,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        source: 'gps',
        timestamp: new Date().toISOString(),
      });

      // Close location sheet and show success
      hideLocationSheet();
      showToast({
        title: t('common.success') || 'Success',
        message: `Location detected: ${locationString}`,
        type: 'success'
      });

    } catch (err) {
      showToast({
        title: t('errors.title') || 'Error',
        message: t('errors.locationDetectionFailed') || 'Failed to detect location',
        type: 'error'
      });
    } finally {
      setLocationLoading(false);
      setDotsCount(0);
      // Clear dots interval if it exists
      if (dotsInterval) {
        clearInterval(dotsInterval);
      }
    }
  }, [user, updateProfile, setUserLocation, showToast, t]);

  // Location search function similar to OnboardingInteractive
  const handleLocationSearch = async (query: string) => {
    // Update form data as user types
    setFormData((prev) => ({ ...prev, location: query }));

    // Clear previous timeout
    if (locationSearchTimeout) {
      clearTimeout(locationSearchTimeout);
    }

    if (!query.trim() || query.length < 2) {
      setLocationSearchResults([]);
      return;
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      try {
        // Try with original query first
        let results = await Location.geocodeAsync(query);

        // If no results, try with more specific search terms
        if (results.length === 0) {
          const searchTerms = [
            `${query}, Sweden`,
            `${query}, United States`,
            `${query}, Europe`,
            query, // Original query as fallback
          ];

          for (const term of searchTerms) {
            results = await Location.geocodeAsync(term);
            if (results.length > 0) break;
          }
        }

        if (results.length > 0) {
          const addresses = await Promise.all(
            results.map(async (result) => {
              try {
                const address = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude,
                });
                return {
                  ...address[0],
                  coords: {
                    latitude: result.latitude,
                    longitude: result.longitude,
                  },
                };
              } catch (err) {
                return null;
              }
            })
          );

          // Filter out null values and duplicates
          const uniqueAddresses = addresses.filter(
            (addr, index, self) =>
              addr &&
              addr.coords &&
              index ===
                self.findIndex(
                  (a) =>
                    a?.coords?.latitude === addr.coords?.latitude &&
                    a?.coords?.longitude === addr.coords?.longitude,
                ),
          );

          setLocationSearchResults(uniqueAddresses);
          if (uniqueAddresses.length > 0) {
            setShowLocationDrawer(true);
          }
        } else {
          setLocationSearchResults([]);
        }
      } catch (err) {
        console.error('Location geocoding error:', err);
        setLocationSearchResults([]);
      }
    }, 300);

    setLocationSearchTimeout(timeout);
  };

  // Handle location selection from autocomplete
  const handleLocationSelect = async (locationData: any) => {
    const locationName = [locationData.city, locationData.region, locationData.country]
      .filter(Boolean)
      .join(', ');
    
    setFormData((prev) => ({
      ...prev,
      location: locationName,
      location_lat: locationData.coords?.latitude || null,
      location_lng: locationData.coords?.longitude || null,
    }));
    
    // Save to database profile (both location and preferred_city fields)
    if (user && locationData.coords?.latitude && locationData.coords?.longitude) {
      try {
        await updateProfile({
          location: locationName,
          location_lat: locationData.coords.latitude,
          location_lng: locationData.coords.longitude,
        });
        console.log('✅ Location saved to profile:', locationName);
      } catch (error) {
        console.error('Error saving selected location:', error);
      }
    }
    
    // Update LocationContext with selected location
    if (locationData.coords?.latitude && locationData.coords?.longitude) {
      await setUserLocation({
        name: locationName,
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        source: 'profile',
        timestamp: new Date().toISOString(),
      });
    }
    
    hideLocationSheet();
    setLocationSearchResults([]);
  };

  const handleShowOnboarding = async () => {
    await resetOnboarding('vromm_onboarding');
    setShowOnboarding(true);
  };

  const handleResetOnboarding = async () => {
    try {
      await resetOnboardingForCurrentUser();
      alert('Onboarding has been reset. You will see onboarding again next time you open the app.');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding.');
    }
  };

  const navigateToOnboardingDemo = useCallback(() => {
    navigation.navigate('OnboardingDemo');
  }, [navigation]);

  const navigateToTranslationDemo = useCallback(() => {
    navigation.navigate('TranslationDemo');
  }, [navigation]);

  const refreshTranslations = useCallback(async () => {
    try {
      setLoading(true);
      // First debug the current translation cache
      await debugTranslations();

      // Ask for confirmation
      Alert.alert(t('profile.refreshTranslations'), t('profile.refreshConfirm'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.save'),
          onPress: async () => {
            try {
              // Force refresh all translations
              await forceRefreshTranslations();

              // Debug the new translations cache
              await debugTranslations();

              showToast({
                title: 'Success',
                message: t('profile.refreshSuccess'),
                type: 'success'
              });
            } catch (err) {
              console.error('Error refreshing translations:', err);
              showToast({
                title: t('common.error'),
                message: 'Failed to refresh translations',
                type: 'error'
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    } catch (err) {
      console.error('Error in refreshTranslations:', err);
      Alert.alert(t('common.error'), 'Failed to handle translations');
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Avatar upload handler
  const handlePickAvatar = async (useCamera = false) => {
    try {
      setAvatarUploading(true);
      let result;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showToast({
            title: 'Permission needed',
            message: 'Camera permission is required to take a photo',
            type: 'error'
          });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast({
            title: 'Permission needed',
            message: 'Media library permission is required',
            type: 'error'
          });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        if (!asset.uri) {
          throw new Error('No image URI found');
        }

        // Use the same stable method as AddReviewScreen
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]); // Remove data URL prefix
          };
          reader.onerror = () => reject(new Error('Failed to process image'));
          reader.readAsDataURL(blob);
        });

        // Determine file extension
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const userId = profile?.id || 'unknown-user';
        const fileName = `avatars/${userId}/${Date.now()}.${ext}`;

        // Upload to Supabase storage with monitoring
        const uploadResult = await monitorNetworkCall(
          () =>
            supabase.storage.from('avatars').upload(fileName, decode(base64), {
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              upsert: true,
            }),
          `storage/avatars/${fileName}`,
          'POST',
        );

        if (uploadResult.error) {
          logError('Avatar upload failed', uploadResult.error);
          throw uploadResult.error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(fileName);

        // Save avatar URL to profile with monitoring
        await monitorDatabaseCall(
          () => updateProfile({ ...formData, avatar_url: publicUrl }),
          'profiles',
          'update',
          ['avatar_url', 'updated_at'],
        );

        checkMemoryUsage('ProfileScreen.avatarUpload');
        setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
        // Alert.alert('Success', 'Avatar updated!');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      showToast({
        title: t('errors.title') || 'Error',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setAvatarUploading(true);
      await updateProfile({ ...formData, avatar_url: null });
      setFormData((prev) => ({ ...prev, avatar_url: null }));
      showToast({
        title: 'Success',
        message: 'Avatar removed!',
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to delete avatar',
        type: 'error'
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Avatar modal show/hide functions
  const showAvatarSheet = () => {
    setShowAvatarModal(true);
    // Fade in the backdrop
    Animated.timing(avatarBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(avatarSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideAvatarSheet = () => {
    // Fade out the backdrop
    Animated.timing(avatarBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(avatarSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowAvatarModal(false);
    });
  };

  // Location modal show/hide functions  
  const showLocationSheet = () => {
    setShowLocationDrawer(true);
    // Fade in the backdrop
    Animated.timing(locationBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(locationSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideLocationSheet = () => {
    // Fade out the backdrop
    Animated.timing(locationBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(locationSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowLocationDrawer(false);
    });
  };

  // Developer options modal show/hide functions
  const showDeveloperSheet = () => {
    setShowDeveloperModal(true);
    // Fade in the backdrop
    Animated.timing(developerBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(developerSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideDeveloperSheet = () => {
    // Fade out the backdrop
    Animated.timing(developerBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(developerSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowDeveloperModal(false);
    });
  };

  // Role modal show/hide functions
  const showRoleSheet = () => {
    setShowRoleModal(true);
    Animated.timing(roleBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(roleSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideRoleSheet = () => {
    Animated.timing(roleBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(roleSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowRoleModal(false);
    });
  };

  // Experience modal show/hide functions
  const showExperienceSheet = () => {
    setShowExperienceModal(true);
    Animated.timing(experienceBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(experienceSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideExperienceSheet = () => {
    Animated.timing(experienceBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(experienceSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowExperienceModal(false);
    });
  };

  // Language modal show/hide functions
  const showLanguageSheet = () => {
    setShowLanguageModal(true);
    Animated.timing(languageBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(languageSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideLanguageSheet = () => {
    Animated.timing(languageBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(languageSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowLanguageModal(false);
    });
  };

  // Notification modal show/hide functions
  const showNotificationSheet = () => {
    setShowNotificationModal(true);
    Animated.timing(notificationBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(notificationSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideNotificationSheet = () => {
    Animated.timing(notificationBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(notificationSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowNotificationModal(false);
    });
  };

  // Get system color scheme at component level (for theme settings display)
  const systemColorScheme = useColorScheme();

  // Theme modal show/hide functions
  const showThemeSheet = () => {
    console.log('🎨 Opening theme settings modal');
    console.log('🎨 Current theme preference:', profile?.theme_preference || 'system');
    console.log('🎨 Profile data:', { 
      theme_preference: profile?.theme_preference,
      hasProfile: !!profile 
    });
    console.log('🎨 System color scheme:', systemColorScheme);
    console.log('🎨 Current effective theme:', profile?.theme_preference === 'system' ? systemColorScheme : profile?.theme_preference);
    setShowThemeModal(true);
    Animated.timing(themeBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(themeSheetTranslateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideThemeSheet = () => {
    Animated.timing(themeBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(themeSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowThemeModal(false);
    });
  };



  // Körkortsplan modal show/hide functions
  const showKorkortsplanSheet = () => {
    setShowKorkortsplanModal(true);
    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(korkortsplanSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideKorkortsplanSheet = () => {
    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(korkortsplanSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowKorkortsplanModal(false);
    });
  };

  // Delete account modal show/hide functions
  const showDeleteSheet = () => {
    setShowDeleteDialog(true);
    Animated.timing(deleteBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(deleteModalScale, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  };

  const hideDeleteSheet = () => {
    Animated.timing(deleteBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(deleteModalScale, {
      toValue: 0.8,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteDialog(false);
    });
  };

  // License plan functions (moved from LicensePlanScreen)
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleLicensePlanSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Format the data to save
      const licenseData = {
        target_date: targetDate ? targetDate.toISOString() : null,
        has_theory: hasTheory,
        has_practice: hasPractice,
        previous_experience: previousExperience,
        specific_goals: specificGoals,
      };

      // Update the profile
      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh the profile to get the updated data
      await refreshProfile();

      showToast({
        title: 'Sparad!',
        message: 'Din körkortsplan har sparats',
        type: 'success'
      });

      // Hide the modal
      hideKorkortsplanSheet();
    } catch (err) {
      console.error('Error saving license plan:', err);
      showToast({
        title: 'Fel',
        message: 'Kunde inte spara körkortsplanen',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get user's complete profile with relationships
  const getUserProfileWithRelationships = useCallback(
    async (userId: string) => {
      try {
        setRelationshipsLoading(true);

        // Get supervisors using direct query to include relationship dates
        const { data: supervisorsData, error: supervisorsError } = await supabase
          .from('student_supervisor_relationships')
          .select(`
            supervisor_id,
            created_at,
            profiles!ssr_supervisor_id_fkey (
              id,
              full_name,
              email,
              role
            )
          `)
          .eq('student_id', userId);

        // Transform supervisor data to match expected format
        const transformedSupervisors = supervisorsData?.map(rel => ({
          supervisor_id: rel.supervisor_id,
          supervisor_name: (rel as any).profiles?.full_name || t('profile.unknownSupervisor') || 'Unknown Supervisor',
          supervisor_email: (rel as any).profiles?.email || '',
          relationship_created: rel.created_at,
        })) || [];

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
          console.error('Error fetching supervisors:', supervisorsError);
        } else {
          setSupervisors(transformedSupervisors);
        }

        // Transform school data to match expected format
        const transformedSchools = schoolsError
          ? []
          : schoolsData?.map((membership) => ({
              school_id: membership.school_id,
              school_name: (membership as any).schools.name,
              school_location: (membership as any).schools.location,
            })) || [];

        if (schoolsError) {
          console.error('Error fetching schools:', schoolsError);
        } else {
          setSchools(transformedSchools);
        }

        logInfo('Relationships loaded', {
          supervisorCount: supervisorsData?.length || 0,
          schoolCount: transformedSchools.length,
        });
      } catch (error) {
        logError('Error fetching user relationships', error as Error);
      } finally {
        setRelationshipsLoading(false);
      }
    },
    [logInfo, logError],
  );

  // Allow user to leave supervisor
  const leaveSupervisor = async (supervisorId: string) => {
    try {
      const { data: success, error } = await supabase.rpc('leave_supervisor', {
        supervisor_id_to_leave: supervisorId,
      });

      if (error) throw error;

      if (success && profile?.id) {
        showToast({
          title: 'Success',
          message: 'You have left your supervisor',
          type: 'success'
        });
        // Refresh the relationships
        await getUserProfileWithRelationships(profile.id);
      }

      return success;
    } catch (error) {
      logError('Error leaving supervisor', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to leave supervisor',
        type: 'error'
      });
      return false;
    }
  };

  // Allow user to leave school
  const leaveSchool = async (schoolId: string) => {
    try {
      const { data: success, error } = await supabase.rpc('leave_school', {
        school_id_to_leave: schoolId,
      });

      if (error) throw error;

      if (success && profile?.id) {
        showToast({
          title: 'Success',
          message: 'You have left the school',
          type: 'success'
        });
        // Refresh the relationships
        await getUserProfileWithRelationships(profile.id);
      }

      return success;
    } catch (error) {
      logError('Error leaving school', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to leave school',
        type: 'error'
      });
      return false;
    }
  };

  // Fetch available supervisors from database (only users who can supervise)
  const fetchAvailableSupervisors = useCallback(async () => {
    try {
      console.log('🔍 Fetching available supervisors...');
      console.log('🔍 Current user profile:', profile);
      
      // Only fetch users with roles that can supervise
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['instructor', 'admin', 'school'])
        .neq('id', profile?.id) // Exclude current user
        .order('full_name');

      console.log('🔍 Available supervisors query result:', { data, error });

      if (error) {
        console.error('🔍 Error fetching supervisors:', error);
        throw error;
      }
      
      console.log(`🔍 Found ${data?.length || 0} potential supervisors`);
      if (data && data.length > 0) {
        data.forEach((supervisor: any) => {
          console.log('🔍 Supervisor found:', { 
            id: supervisor.id, 
            name: supervisor.full_name, 
            email: supervisor.email, 
            role: supervisor.role 
          });
        });
      }
      setAvailableSupervisors((data as any) || []);
    } catch (error) {
      logError('Error fetching supervisors', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to load available supervisors',
        type: 'error'
      });
    }
  }, [profile?.id, logError]);

  // Fetch ALL available students for instructors to select
  const fetchAvailableStudents = useCallback(async () => {
    try {
      console.log('🔍 Fetching available students...');
      
      // Fetch all students
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');

      if (error) {
        console.error('🔍 Error fetching students:', error);
        throw error;
      }
      
      console.log(`🔍 Found ${data?.length || 0} students`);
      setAvailableStudents((data as any) || []);
    } catch (error) {
      logError('Error fetching students', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to load available students',
        type: 'error'
      });
    }
  }, [logError]);

  // Search for users to invite
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .neq('id', profile?.id) // Exclude current user
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        logError('Error searching users', error as Error);
      } finally {
        setSearchLoading(false);
      }
    },
    [profile?.id, logError],
  );

  // Send invitation - unified for both directions with push notification
  const sendInvitation = async (targetUserId: string, invitationType: 'supervisor' | 'student') => {
    try {
      if (!profile?.id) return;

      const targetUser = searchResults.find((u) => u.id === targetUserId);
      if (!targetUser) return;

      // Send enhanced push notification with database storage
      await pushNotificationService.sendInvitationNotification(
        profile.id,
        targetUserId,
        profile.full_name || profile.email || t('profile.unknownUser') || 'Unknown User',
        profile.role || 'user',
        invitationType,
      );

      Alert.alert(
        'Invitation Sent!',
        `${invitationType === 'student' ? 'Student supervision' : 'Supervisor'} invitation sent to ${targetUser.full_name || targetUser.email}. They will receive a push notification.`,
      );

      setShowInviteModal(false);
      setSearchQuery('');
      setSearchResults([]);

      logInfo('Invitation sent successfully', {
        targetUserId,
        invitationType,
        targetUserName: targetUser.full_name,
      });
    } catch (error) {
      logError('Error sending invitation', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to send invitation. Please try again.',
        type: 'error'
      });
    }
  };

  // Handle bulk email invitations for new users with custom passwords
  const handleBulkInvite = async () => {
    try {
      const validEmails = inviteEmails.filter(email => email.includes('@'));
      if (validEmails.length === 0) {
        showToast({
          title: t('profile.invalidEmails') || 'Invalid Emails',
          message: 'Please enter valid email addresses',
          type: 'error'
        });
        return;
      }

      // Determine role and relationship type based on who's inviting
      let role: UserRole;
      let relationshipType: 'student_invites_supervisor' | 'supervisor_invites_student' | undefined;
      
      if (profile?.role === 'student') {
        // Student can invite supervisors
        role = inviteType === 'supervisor' ? 'instructor' : 'student';
        relationshipType = inviteType === 'supervisor' ? 'student_invites_supervisor' : undefined;
      } else if (canSuperviseStudents()) {
        // Supervisors invite students
        role = 'student';
        relationshipType = 'supervisor_invites_student';
      } else {
        role = inviteType === 'student' ? 'student' : 'instructor';
      }

      // Create invitation entries with custom passwords and message
      const invitations = validEmails.map((email, index) => ({
        email,
        password: invitePasswords[index] && invitePasswords[index].trim() 
          ? invitePasswords[index].trim() 
          : undefined, // Use auto-generated password if not provided
        customMessage: inviteCustomMessage.trim() || undefined, // Add custom message
      }));

      // Send invitations with custom passwords
      const result = await inviteUsersWithPasswords(
        invitations,
        role,
        profile?.id,
        profile?.full_name || profile?.email || undefined,
        profile?.role as UserRole,
        relationshipType,
        inviteCustomMessage.trim() || undefined, // Pass global custom message
      );

      if (result.successful.length > 0) {
        Alert.alert(
          'Invitations Sent!',
          `Successfully invited ${result.successful.length} ${inviteType}(s). They can login immediately with their assigned passwords.`,
        );
      }

      if (result.failed.length > 0) {
        Alert.alert(
          'Some Invitations Failed',
          `Failed to invite: ${result.failed.map(f => f.email).join(', ')}`,
        );
      }

      setShowInviteModal(false);
      setInviteEmails([]);
      setInvitePasswords([]); // Clear passwords
      setInviteCustomMessage(''); // Clear custom message
      fetchPendingInvitations();
    } catch (error) {
      logError('Error sending bulk invitations', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to send invitations. Please try again.',
        type: 'error'
      });
    }
  };

  // Fetch pending invitations
  const fetchPendingInvitations = async () => {
    if (!profile?.id) return;
    const invites = await getPendingInvitations(profile.id);
    setPendingInvitations(invites);
  };

  // Resend an invitation
  const handleResendInvite = async (invitationId: string) => {
    const success = await resendInvitation(invitationId);
    if (success) {
      showToast({
        title: 'Success',
        message: 'Invitation resent successfully',
        type: 'success'
      });
    } else {
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to resend invitation',
        type: 'error'
      });
    }
  };

  // Cancel an invitation
  const handleCancelInvite = async (invitationId: string) => {
    Alert.alert(
      t('profile.cancelInvitation') || 'Cancel Invitation',
      'Are you sure you want to cancel this invitation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelInvitation(invitationId);
            if (success) {
              fetchPendingInvitations();
              showToast({
                title: 'Success',
                message: 'Invitation cancelled',
                type: 'success'
              });
            } else {
              showToast({
                title: t('errors.title') || 'Error',
                message: 'Failed to cancel invitation',
                type: 'error'
              });
            }
          },
        },
      ],
    );
  };

  // Fix the fetchSupervisedStudents function with a simpler approach
  const fetchSupervisedStudents = useCallback(async () => {
    try {
      if (!profile?.id) return;

      // Get student relationships first, then fetch profile details separately
      const { data: relationships, error: relError } = await supabase
        .from('student_supervisor_relationships')
        .select('student_id, created_at')
        .eq('supervisor_id', profile.id);

      if (relError) {
        console.error('Error fetching student relationships:', relError);
        logError('Error fetching student relationships', relError);
        return;
      }

      if (!relationships || relationships.length === 0) {
        setSupervisedStudents([]);
        return;
      }

      // Get profile details for all students
      const studentIds = relationships.map((rel) => rel.student_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profileError) {
        console.error('Error fetching student profiles:', profileError);
        logError('Error fetching student profiles', profileError);
        return;
      }

      const students =
        profiles?.map((profile) => {
          const relationship = relationships.find(rel => rel.student_id === profile.id);
          return {
            id: profile.id,
            full_name: profile.full_name || t('profile.unknownStudent') || 'Unknown Student',
            email: profile.email || '',
            relationship_created: relationship?.created_at || '',
          };
        }) || [];

      setSupervisedStudents(students);
      logInfo('Supervised students loaded', { studentCount: students.length });
    } catch (error) {
      logError('Error fetching supervised students', error as Error);
    }
  }, [profile?.id, logInfo, logError]);

  // Check if current user can supervise students (instructor/school/admin roles have supervision capabilities)
  const canSuperviseStudents = () => {
    const supervisorRoles = ['instructor', 'school', 'admin'];
    return profile?.role && supervisorRoles.includes(profile.role);
  };

  // Get current active student or self
  const getActiveUser = () => {
    if (activeStudentId && supervisedStudents.length > 0) {
      const student = supervisedStudents.find((s) => s.id === activeStudentId);
      return student
        ? {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            isStudent: true,
          }
        : {
            id: profile?.id || '',
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            isStudent: false,
          };
    }
    return {
      id: profile?.id || '',
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      isStudent: false,
    };
  };

  // Switch active student
  const switchActiveStudent = (studentId: string | null) => {
    if (studentId) {
      const student = supervisedStudents.find((s) => s.id === studentId);
      setActiveStudent(studentId, student?.full_name);
      logInfo('Switched to student view', {
        studentId,
        studentName: student?.full_name,
      });
      Alert.alert(
        'Student View Active',
        `You are now viewing ${student?.full_name}'s progress and data.`,
      );
    } else {
      clearActiveStudent();
      logInfo('Switched back to own view');
      Alert.alert('Own View Active', 'You are now viewing your own progress and data.');
    }
    setShowStudentSelector(false);
  };

  // Fetch available schools from database
  const fetchAvailableSchools = useCallback(async () => {
    try {
      console.log('🏫 Fetching available schools...');
      console.log('🏫 Supabase client:', supabase);

      // First try to query with minimal selection
      console.log('🏫 Testing basic schools query...');
      const basicQuery = await supabase.from('schools').select('*').limit(10);

      console.log('🏫 Basic query result:', basicQuery);

      // Now try the full query
      console.log('🏫 Running full schools query...');
      const { data, error, count } = await supabase
        .from('schools')
        .select('id, name, location, is_active', { count: 'exact' })
        .order('name');

      console.log('🏫 Full query result:', { data, error, count });
      console.log('🏫 Raw data length:', data?.length);
      console.log('🏫 Individual schools:', JSON.stringify(data, null, 2));

      if (error) {
        console.error('🏫 Schools query error:', error);
        Alert.alert('Error', `Failed to fetch schools: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('🏫 No schools found in database!');
        Alert.alert(t('debug.title') || 'Debug Info', t('debug.noSchools') || 'No schools found in database. Check console for details.');
        return;
      }

      console.log(`🏫 SUCCESS: Found ${data.length} schools`);
      setAvailableSchools((data as any) || []);
    } catch (error) {
      console.error('🏫 Error in fetchAvailableSchools:', error);
      Alert.alert('Error', `Exception in fetchAvailableSchools: ${error}`);
      logError('Error fetching schools', error as Error);
    }
  }, [logError]);

  // Send invitations to supervisors (requires their acceptance)
  const addSupervisors = async (supervisorIds: string[]) => {
    try {
      if (!profile?.id || supervisorIds.length === 0) return;

      // Check for existing relationships and filter out duplicates
      const { data: existingRelationships } = await supabase
        .from('student_supervisor_relationships')
        .select('supervisor_id')
        .eq('student_id', profile.id)
        .in('supervisor_id', supervisorIds);

      const existingSupervisorIds = existingRelationships?.map((r) => r.supervisor_id) || [];
      const newSupervisorIds = supervisorIds.filter(
        (id) => !existingSupervisorIds.includes(id),
      );

      if (newSupervisorIds.length === 0) {
        Alert.alert('Info', 'All selected supervisors are already assigned to you');
        setSelectedSupervisorIds([]);
        return;
      }

      // Send invitations to each supervisor instead of directly creating relationships
      let successCount = 0;
      let failCount = 0;
      
      for (const supervisorId of newSupervisorIds) {
        try {
          // Get supervisor details
          const { data: supervisorProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', supervisorId)
            .single();
            
          if (!supervisorProfile?.email) {
            failCount++;
            continue;
          }

          // Create pending invitation that requires supervisor's acceptance
          const { data: invitationData, error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: supervisorProfile.email.toLowerCase(),
              role: 'instructor',
              invited_by: profile.id,
              metadata: {
                supervisorName: profile.full_name || profile.email,
                inviterRole: 'student',
                relationshipType: 'student_invites_supervisor',
                invitedAt: new Date().toISOString(),
                targetUserId: supervisorId,
                targetUserName: supervisorProfile.full_name,
              },
              status: 'pending',
            })
            .select()
            .single();

          if (inviteError) {
            console.error('Error creating supervisor invitation:', inviteError);
            failCount++;
            continue;
          }

          // CRITICAL: Ensure invitation was created successfully
          if (!invitationData || !invitationData.id) {
            console.error('❌ Invitation creation failed - no data returned for:', supervisorProfile.email);
            failCount++;
            continue;
          }

          console.log('✅ Invitation created successfully with ID:', invitationData.id);

          // Create notification for the supervisor with invitation ID
          await supabase.from('notifications').insert({
            user_id: supervisorId,
            actor_id: profile.id,
            type: 'supervisor_invitation',
            title: 'New Supervision Request',
            message: `${profile.full_name || profile.email || 'A student'} wants you to be their supervisor`,
            metadata: {
              relationship_type: 'student_invites_supervisor',
              from_user_id: profile.id,
              from_user_name: profile.full_name || profile.email,
              target_user_id: supervisorId,
              invitation_id: invitationData.id, // Now guaranteed to exist
            },
            action_url: 'vromm://notifications',
            priority: 'high',
            is_read: false,
          });

          successCount++;
        } catch (error) {
          console.error('Error sending supervisor invitation:', error);
          failCount++;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Invitations Sent! 📤',
          `${successCount} supervision request${successCount !== 1 ? 's' : ''} sent. Supervisors will need to accept before the relationship is created.`
        );
      }

      if (failCount > 0) {
        Alert.alert('Some Invitations Failed', `Failed to send ${failCount} invitation(s).`);
      }

      // Refresh data
      await getUserProfileWithRelationships(profile.id);
      fetchPendingInvitations(); // Refresh pending invitations
      setSelectedSupervisorIds([]);
    } catch (error) {
      console.error('Error sending supervisor invitations:', error);
      Alert.alert('Error', 'Failed to send supervisor invitations');
    }
  };

  // Send supervisor invitations (requires their acceptance) - same as addSupervisors
  const joinSupervisors = async () => {
    try {
      if (!profile?.id || selectedSupervisorIds.length === 0) return;

      // Check for existing relationships and filter out duplicates
      const { data: existingRelationships } = await supabase
        .from('student_supervisor_relationships')
        .select('supervisor_id')
        .eq('student_id', profile.id)
        .in('supervisor_id', selectedSupervisorIds);

      const existingSupervisorIds = existingRelationships?.map((r) => r.supervisor_id) || [];
      const newSupervisorIds = selectedSupervisorIds.filter(
        (id) => !existingSupervisorIds.includes(id),
      );

      if (newSupervisorIds.length === 0) {
        Alert.alert('Info', 'All selected supervisors are already assigned to you');
        setShowSupervisorModal(false);
        setSelectedSupervisorIds([]);
        return;
      }

      // Send invitations to each supervisor instead of directly creating relationships
      let successCount = 0;
      let failCount = 0;
      
      for (const supervisorId of newSupervisorIds) {
        try {
          // Get supervisor details
          const { data: supervisorProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', supervisorId)
            .single();
            
          if (!supervisorProfile?.email) {
            failCount++;
            continue;
          }

          // Create pending invitation that requires supervisor's acceptance
          const { data: invitationData, error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: supervisorProfile.email.toLowerCase(),
              role: 'instructor',
              invited_by: profile.id,
              metadata: {
                supervisorName: profile.full_name || profile.email,
                inviterRole: 'student',
                relationshipType: 'student_invites_supervisor',
                invitedAt: new Date().toISOString(),
                targetUserId: supervisorId,
                targetUserName: supervisorProfile.full_name,
              },
              status: 'pending',
            })
            .select()
            .single();

          if (inviteError) {
            console.error('Error creating supervisor invitation:', inviteError);
            failCount++;
            continue;
          }

          // CRITICAL: Ensure invitation was created successfully
          if (!invitationData || !invitationData.id) {
            console.error('❌ Invitation creation failed - no data returned for:', supervisorProfile.email);
            failCount++;
            continue;
          }

          console.log('✅ Invitation created successfully with ID:', invitationData.id);

          // Create notification for the supervisor with invitation ID
          await supabase.from('notifications').insert({
            user_id: supervisorId,
            actor_id: profile.id,
            type: 'supervisor_invitation',
            title: 'New Supervision Request',
            message: `${profile.full_name || profile.email || 'A student'} wants you to be their supervisor`,
            metadata: {
              relationship_type: 'student_invites_supervisor',
              from_user_id: profile.id,
              from_user_name: profile.full_name || profile.email,
              target_user_id: supervisorId,
              invitation_id: invitationData.id, // Now guaranteed to exist
            },
            action_url: 'vromm://notifications',
            priority: 'high',
            is_read: false,
          });

          successCount++;
        } catch (error) {
          console.error('Error sending supervisor invitation:', error);
          failCount++;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Supervision Requests Sent!',
          `${successCount} request${successCount !== 1 ? 's' : ''} sent. Supervisors will receive notifications and need to accept before becoming your supervisor.`
        );
      }

      if (failCount > 0) {
        Alert.alert('Some Requests Failed', `Failed to send ${failCount} request(s).`);
      }

      // Refresh relationships and close modal
      await getUserProfileWithRelationships(profile.id);
      fetchPendingInvitations(); // Refresh pending invitations
      setShowSupervisorModal(false);
      setSelectedSupervisorIds([]);
    } catch (error) {
      logError('Error sending supervisor requests', error as Error);
      Alert.alert('Error', 'Failed to send supervisor requests');
    }
  };

  // Join school
  const joinSchool = async (schoolId: string) => {
    try {
      if (!profile?.id) return;

      // First check if user is already a member
      const { data: existingMembership } = await supabase
        .from('school_memberships')
        .select('id')
        .eq('user_id', profile.id)
        .eq('school_id', schoolId)
        .single();

      if (existingMembership) {
        Alert.alert('Info', 'You are already a member of this school');
        setShowSchoolModal(false);
        return;
      }

      const { error } = await supabase.from('school_memberships').insert([
        {
          user_id: profile.id,
          school_id: schoolId,
          role: 'student',
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'You are already a member of this school');
        } else {
          throw error;
        }
        setShowSchoolModal(false);
        return;
      }

      Alert.alert('Success', 'School joined successfully');

      // Refresh relationships and close modal
      await getUserProfileWithRelationships(profile.id);
      setShowSchoolModal(false);
    } catch (error) {
      logError('Error joining school', error as Error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to join school',
        type: 'error'
      });
    }
  };

  // Fetch driving statistics
  const fetchDrivingStats = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setStatsLoading(true);

      // Get active user ID (own or student being supervised)
      const activeUserId = activeStudentId || profile.id;

      // Fetch route recordings from the last 4 weeks for more data
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      // Use driven_routes to get route activity data
      const { data: recordings, error } = await supabase
        .from('driven_routes')
        .select(
          `
          *,
          routes!inner(
            id,
            name,
            metadata
          )
        `,
        )
        .eq('user_id', activeUserId)
        .gte('driven_at', fourWeeksAgo.toISOString())
        .order('driven_at', { ascending: false });

      if (error) {
        console.error('Error fetching driving stats:', error);
        return;
      }

      // Process the data into weekly stats
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      // Initialize daily stats
      const dailyStats: DayStats[] = weekDays.map((day) => ({
        day: format(day, 'E'), // Mon, Tue, etc.
        dayIndex: getDay(day),
        distance: 0,
        time: 0,
        routes: 0,
      }));

      let totalDistance = 0;
      let totalTime = 0;
      const totalRoutes = recordings?.length || 0;

      // Process recordings from driven_routes
      recordings?.forEach((recording) => {
        const recordingDate = parseISO(recording.driven_at || recording.created_at);
        const dayOfWeek = getDay(recordingDate);

        // Find matching day in our week (adjust for Monday start)
        const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Sunday=6
        const dayStats = dailyStats[adjustedDayIndex];

        if (dayStats) {
          // Extract distance and time from route metadata if available
          const metadata = recording.routes?.metadata || {};
          const distance = metadata.distance || Math.random() * 15 + 2; // Fallback for demo
          const time = metadata.duration || Math.random() * 45 + 10; // Fallback for demo

          dayStats.distance += distance;
          dayStats.time += time;
          dayStats.routes += 1;

          totalDistance += distance;
          totalTime += time;
        }
      });

      // Find most active day
      const mostActiveDay = dailyStats.reduce((prev, current) =>
        current.routes > prev.routes ? current : prev,
      ).day;

      const stats: DrivingStats = {
        weeklyData: dailyStats,
        totalDistance,
        totalTime,
        totalRoutes,
        mostActiveDay,
        averagePerDay: {
          distance: totalDistance / 7,
          time: totalTime / 7,
        },
      };

      setDrivingStats(stats);
      logInfo('Driving stats loaded', {
        totalRoutes,
        totalDistance: totalDistance.toFixed(1),
        mostActiveDay,
      });
    } catch (error) {
      logError('Error fetching driving stats', error as Error);
    } finally {
      setStatsLoading(false);
    }
  }, [profile?.id, activeStudentId, logInfo, logError]);

  // Fetch subscription plans from database
  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      setBillingLoading(true);
      
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_amount', { ascending: true });
        
      if (error) {
        console.error('Error fetching subscription plans:', error);
        return;
      }
      
      setSubscriptionPlans(plans || []);
      console.log('✅ Loaded subscription plans:', plans?.length || 0);
    } catch (error) {
      logError('Error fetching subscription plans', error as Error);
    } finally {
      setBillingLoading(false);
    }
  }, [logError]);

  // Fetch payment history for current user
  const fetchPaymentHistory = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching payment history:', error);
        return;
      }
      
      setPaymentHistory(payments || []);
      console.log('✅ Loaded payment history:', payments?.length || 0, 'transactions');
    } catch (error) {
      logError('Error fetching payment history', error as Error);
    }
  }, [profile?.id, logError]);

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (profile?.id) {
        const promises = [
          getUserProfileWithRelationships(profile.id),
          fetchAvailableSupervisors(),
          fetchAvailableSchools(),
          fetchDrivingStats(), // Add stats fetch to refresh
          fetchPendingInvitations(), // Add pending invitations to refresh
          loadRelationshipReviews(), // Add relationship reviews to refresh
        ];

        // Add supervised students fetch for teachers/instructors
        if (canSuperviseStudents()) {
          promises.push(fetchSupervisedStudents());
        }

        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Check for pending invitations
  const checkForPendingInvitations = useCallback(async () => {
    if (!user?.email) return;

    try {
      // Get pending invitations, but filter out ones where relationship already exists
      const { data: invitations, error } = await supabase
        .from('pending_invitations')
        .select('id, invited_by')
        .eq('email', user.email)
        .eq('status', 'pending');

      if (error) throw error;

      if (invitations && invitations.length > 0) {
        // Check if any of these invitations don't already have relationships
        let hasValidInvitation = false;
        
        for (const inv of invitations) {
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(`and(student_id.eq.${user.id},supervisor_id.eq.${inv.invited_by}),and(student_id.eq.${inv.invited_by},supervisor_id.eq.${user.id})`)
            .limit(1);

          if (!existingRelationship || existingRelationship.length === 0) {
            hasValidInvitation = true;
            break;
          }
        }

        if (hasValidInvitation) {
          console.log('📱 ProfileScreen: Found valid invitations (global modal should handle this)');
        }
      }
    } catch (error) {
      console.error('Error checking for pending invitations:', error);
      
      // For testing: If table doesn't exist and user is daniel@lauding.se, show notification anyway
      if ((error as any).message?.includes('relation "pending_invitations" does not exist') && 
          user.email === 'daniel@lauding.se') {
        console.log('🧪 Testing: Table does not exist - global modal should handle this');
      }
    }
  }, [user?.email, user?.id]);

  // Helper to get current user's role
  // Supports legacy 'teacher' and 'supervisor' roles as well
  const getUserRole = (): 'student' | 'instructor' | 'school' | 'admin' | 'teacher' | 'supervisor' => {
    return (profile?.role as any) || 'student';
  };

  // Handle unified relationship modal actions
  const handleOpenRelationshipModal = () => {
    console.log('🎯 Opening relationship modal');
    console.log('🎯 User role:', getUserRole());
    console.log('🎯 Can supervise students?', canSuperviseStudents());
    
    // Prepare data based on user role
    if (canSuperviseStudents()) {
      console.log('🎯 User can supervise - fetching supervised students');
      fetchSupervisedStudents();
    } else {
      console.log('🎯 User is student - fetching available supervisors');
      fetchAvailableSupervisors();
    }
    
    console.log('🎯 Current available supervisors:', availableSupervisors);
    console.log('🎯 Current supervised students:', supervisedStudents);
    
    setShowRelationshipModal(true);
  };

  const handleStudentSelection = (studentId: string | null, studentName?: string) => {
    if (studentId) {
      setActiveStudent(studentId, studentName);
      logInfo(`Switched to view student: ${studentName || studentId}`);
      showToast({
        title: 'Student View Active',
        message: `You are now viewing ${studentName || "this student"}'s progress and data.`,
        type: 'info'
      });
    } else {
      clearActiveStudent();
      logInfo('Switched back to own view');
      Alert.alert('Own View Active', 'You are now viewing your own progress and data.');
    }
  };

  const handleInviteUsers = async (emails: string[], inviteRole: string) => {
    if (!profile?.id || !profile.full_name) return;

    try {
      // Determine role and relationship type based on who's inviting
      let targetRole: UserRole = inviteRole as UserRole;
      let relationshipType: 'student_invites_supervisor' | 'supervisor_invites_student' | undefined;
      
      if (profile?.role === 'student' && inviteRole === 'supervisor') {
        // Student inviting supervisors
        targetRole = 'instructor';
        relationshipType = 'student_invites_supervisor';
      } else if (canSuperviseStudents()) {
        // Supervisor inviting students
        targetRole = 'student';
        relationshipType = 'supervisor_invites_student';
      }

      // Create invitation entries (no custom passwords for this flow - use auto-generated)
      const invitations = emails.map(email => ({ 
        email,
        customMessage: inviteCustomMessage.trim() || undefined, // Add custom message
      }));

      // Send invitations using the new function with auto-generated passwords
      const result = await inviteUsersWithPasswords(
        invitations,
        targetRole,
        profile.id,
        profile.full_name || profile.email || undefined,
        profile.role as UserRole,
        relationshipType,
        inviteCustomMessage.trim() || undefined, // Pass global custom message
      );
      
      if (result.failed.length > 0) {
        const errors = result.failed.map(f => `${f.email}: ${f.error}`).join(', ');
        throw new Error(`Failed to send ${result.failed.length} invitation(s): ${errors}`);
      }
      
      Alert.alert(
        'Invitations Sent! 🎉',
        `${result.successful.length} invitation${result.successful.length > 1 ? 's' : ''} sent successfully! Users can login immediately with auto-generated passwords.`,
      );
    } catch (error) {
      console.error('Error in handleInviteUsers:', error);
      throw error; // Let the modal handle the error
    }
  };

  // Handle supervisor removal after review
  const handleRemovalComplete = async () => {
    if (!removalTargetSupervisor || !profile?.id) return;

    try {
      const { removeSupervisorRelationship } = await import('../services/invitationService');
      const success = await removeSupervisorRelationship(
        profile.id, // studentId
        removalTargetSupervisor.id, // supervisorId
        'Review submitted', // removalMessage
        profile.id // removedByUserId
      );
      
      if (success) {
        showToast({
          title: 'Success',
          message: 'You have removed your supervisor and submitted your review',
          type: 'success'
        });
        if (profile?.id) {
          await getUserProfileWithRelationships(profile.id);
        }
      } else {
        showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to remove supervisor',
        type: 'error'
      });
      }
    } catch (error) {
      console.error('Error removing supervisor:', error);
      showToast({
        title: t('errors.title') || 'Error',
        message: 'Failed to remove supervisor',
        type: 'error'
      });
    } finally {
      setRemovalTargetSupervisor(null);
      setShowRemovalReviewModal(false);
    }
  };

  // Load relationships when profile is available
  useEffect(() => {
    if (profile?.id) {
      getUserProfileWithRelationships(profile.id);
      // Also pre-load available options
      fetchAvailableSupervisors();
      fetchAvailableSchools();
      fetchDrivingStats(); // Load driving stats on mount

      // Load supervised students if user can supervise
      if (canSuperviseStudents()) {
        fetchSupervisedStudents();
      }
      
      // Check for pending invitations
      checkForPendingInvitations();
      
      // Load pending invitations for display
      fetchPendingInvitations();

      // Set up real-time subscription for relationship changes
      const relationshipSubscription = supabase
        .channel('student_supervisor_relationships')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'student_supervisor_relationships',
          filter: `student_id=eq.${profile.id}`,
        }, (payload) => {
          console.log('🔄 Student relationship changed:', payload);
          // Refresh relationships when they change
          getUserProfileWithRelationships(profile.id);
          if (canSuperviseStudents()) {
            fetchSupervisedStudents();
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'student_supervisor_relationships',
          filter: `supervisor_id=eq.${profile.id}`,
        }, (payload) => {
          console.log('🔄 Supervisor relationship changed:', payload);
          // Refresh relationships when they change
          getUserProfileWithRelationships(profile.id);
          if (canSuperviseStudents()) {
            fetchSupervisedStudents();
          }
        })
        .subscribe();

      return () => {
        relationshipSubscription.unsubscribe();
      };
    }
  }, [
    profile?.id,
    user?.email,
    getUserProfileWithRelationships,
    fetchAvailableSupervisors,
    fetchAvailableSchools,
    fetchSupervisedStudents,
    fetchDrivingStats,
    checkForPendingInvitations,
  ]);

  // Load sound settings on component mount
  useEffect(() => {
    const loadSoundSettings = async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const soundSetting = await AsyncStorage.getItem('notification_sound_enabled');
        setSoundEnabled(soundSetting !== 'false'); // Default to enabled
      } catch (error) {
        console.error('Error loading sound settings:', error);
        setSoundEnabled(true); // Default to enabled on error
      }
    };

    loadSoundSettings();
  }, []);

  // Refresh stats when active student changes (for supervisors)
  useEffect(() => {
    if (profile?.id) {
      fetchDrivingStats();
    }
  }, [activeStudentId, fetchDrivingStats, profile?.id]);

  // Clean up location search timeout on unmount
  useEffect(() => {
    return () => {
      if (locationSearchTimeout) {
        clearTimeout(locationSearchTimeout);
      }
    };
  }, [locationSearchTimeout]);


  // Load relationship reviews
  const loadRelationshipReviews = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setReviewsLoading(true);
      
      // Get user's rating and review data
      const rating = await RelationshipReviewService.getUserRating(profile.id, profile.role || 'student');
      setUserRating(rating);
      
      // Get all reviews for this user
      const reviews = await RelationshipReviewService.getReviewsForUser(profile.id);
      setRelationshipReviews(reviews);
      
    } catch (error) {
      logError('Error loading relationship reviews', error as Error);
    } finally {
      setReviewsLoading(false);
    }
  }, [profile?.id, profile?.role, logError]);

  // Load reviews on mount and when profile changes
  useEffect(() => {
    loadRelationshipReviews();
  }, [loadRelationshipReviews]);

  return (
    <Screen
      scroll
      padding
      bottomInset={getTabContentPadding()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#00E6C3"
          colors={['#00E6C3']}
          progressBackgroundColor="#1a1a1a"
        />
      }
    >
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={true}
      />

      <YStack f={1} gap={24}>
        <Header
          title={t('profile.title')}
          showBack
          rightElement={
            <XStack gap="$2">
              {!!activeStudentId && (
                <Button
                  onPress={() => {
                    navigation.navigate('PublicProfile', { userId: activeStudentId! });
                  }}
                  variant="secondary"
                  size="sm"
                >
                  <XStack alignItems="center" gap="$2">
                    <Feather name="user" size={16} color="$color" />
                    <Text>{t('profile.viewStudent') || 'View Student'}</Text>
                  </XStack>
                </Button>
              )}
              <Button
                onPress={() => {
                  if (profile?.id) {
                    navigation.navigate('PublicProfile', { userId: profile.id });
                  }
                }}
                variant="secondary"
                size="sm"
              >
                <XStack alignItems="center" gap="$2">
                  <Feather name="eye" size={16} color="$color" />
                  <Text>{t('profile.viewProfile') || 'View Profile'}</Text>
                </XStack>
              </Button>
            </XStack>
          }
        />
        <YStack gap={24}>
          <YStack gap={24}>
            <YStack alignItems="center" marginTop={24} marginBottom={8}>
              <TouchableOpacity onPress={showAvatarSheet} disabled={avatarUploading}>
                <View style={{ position: 'relative' }}>
                  {formData.avatar_url ? (
                    <Image
                      source={{ uri: formData.avatar_url }}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        borderWidth: 2,
                        borderColor: '#ccc',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: '#eee',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: '#ccc',
                      }}
                    >
                      <Feather name="user" size={48} color="#bbb" />
                    </View>
                  )}
                  {/* Edit indicator overlay */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: 'white',
                    }}
                  >
                    <Feather name="edit-2" size={12} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text size="sm" color="$gray11" textAlign="center" marginTop={8}>
                {t('profile.avatar.tapToChange') || 'Tap to change avatar'}
              </Text>
              
              {/* Display rating badge if user has reviews */}
              {userRating.reviewCount > 0 && (
                <YStack alignItems="center" marginTop="$3">
                  <ProfileRatingBadge 
                    averageRating={userRating.averageRating}
                    reviewCount={userRating.reviewCount}
                    size="md"
                    showPreview={true}
                    recentReviews={relationshipReviews.slice(0, 2).map(r => ({
                      content: r.content || '',
                      rating: r.rating,
                      created_at: r.created_at
                    }))}
                  />
                </YStack>
              )}

              {/* Tab Navigation */}
              <XStack justifyContent="center" gap="$2" marginTop="$4" marginBottom="$2">
                <TouchableOpacity
                  onPress={async () => {
                    // Auto-save current changes before switching
                    if (user && (formData.full_name !== profile?.full_name || formData.location !== profile?.location)) {
                      try {
                        await updateProfile(formData);
                        console.log('✅ Auto-saved before tab switch');
                      } catch (error) {
                        console.error('Error auto-saving:', error);
                      }
                    }
                    setActiveTab('overview');
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeTab === 'overview' ? '#00E6C3' : 'transparent',
                    borderWidth: 1,
                    borderColor: activeTab === 'overview' ? '#00E6C3' : '#ccc',
                  }}
                >
                  <Text
                    color={activeTab === 'overview' ? 'white' : '$color'}
                    weight={activeTab === 'overview' ? 'bold' : 'normal'}
                    size="sm"
                  >
                    {t('profile.tabs.overview') || 'Översikt'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={async () => {
                    // Auto-save current changes before switching
                    if (user && (formData.full_name !== profile?.full_name || formData.location !== profile?.location)) {
                      try {
                        await updateProfile(formData);
                        console.log('✅ Auto-saved before tab switch');
                      } catch (error) {
                        console.error('Error auto-saving:', error);
                      }
                    }
                    // Show lock modal instead of switching to stats tab
                    showLockModalAction('lock_stats', 'Statistics');
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeTab === 'stats' ? '#00E6C3' : 'transparent',
                    borderWidth: 1,
                    borderColor: activeTab === 'stats' ? '#00E6C3' : '#ccc',
                  }}
                >
                  <Text
                    color={activeTab === 'stats' ? 'white' : '$color'}
                    weight={activeTab === 'stats' ? 'bold' : 'normal'}
                    size="sm"
                  >
                    {t('profile.tabs.stats') || 'Stats'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={async () => {
                    // Auto-save current changes before switching
                    if (user && (formData.full_name !== profile?.full_name || formData.location !== profile?.location)) {
                      try {
                        await updateProfile(formData);
                        console.log('✅ Auto-saved before tab switch');
                      } catch (error) {
                        console.error('Error auto-saving:', error);
                      }
                    }
                    // Show lock modal instead of switching to relationships tab
                    showLockModalAction('lock_relationships', 'Relationships');
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeTab === 'relationships' ? '#00E6C3' : 'transparent',
                    borderWidth: 1,
                    borderColor: activeTab === 'relationships' ? '#00E6C3' : '#ccc',
                    position: 'relative',
                  }}
                >
                  <Text
                    color={activeTab === 'relationships' ? 'white' : '$color'}
                    weight={activeTab === 'relationships' ? 'bold' : 'normal'}
                    size="sm"
                  >
                    {t('profile.tabs.relationships') || 'Relationer'}
                  </Text>
                  {pendingInvitations.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#FF4444',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        color="white"
                        size="xs"
                        weight="bold"
                      >
                        {pendingInvitations.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={async () => {
                    // Auto-save current changes before switching
                    if (user && (formData.full_name !== profile?.full_name || formData.location !== profile?.location)) {
                      try {
                        await updateProfile(formData);
                        console.log('✅ Auto-saved before tab switch');
                      } catch (error) {
                        console.error('Error auto-saving:', error);
                      }
                    }
                    // Show lock modal instead of switching to billing tab
                    showLockModalAction('lock_billing', 'Billing');
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeTab === 'billing' ? '#00E6C3' : 'transparent',
                    borderWidth: 1,
                    borderColor: activeTab === 'billing' ? '#00E6C3' : '#ccc',
                  }}
                >
                  <Text
                    color={activeTab === 'billing' ? 'white' : '$color'}
                    weight={activeTab === 'billing' ? 'bold' : 'normal'}
                    size="sm"
                  >
                    {t('profile.tabs.billing') || 'Billing'}
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <YStack gap="$4">
                <YStack>
                  <Text size="lg" weight="medium" mb="$2" color="$color">
                    {t('profile.fullName')}
                  </Text>
              <FormField
                value={formData.full_name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, full_name: text }))}
                onBlur={async () => {
                  // Save name when field loses focus
                  if (user && formData.full_name !== profile?.full_name) {
                    try {
                      await updateProfile({ full_name: formData.full_name });
                      console.log('✅ Name updated:', formData.full_name);
                    } catch (error) {
                      console.error('Error saving name:', error);
                    }
                  }
                }}
                placeholder={t('profile.fullNamePlaceholder')}
                autoCapitalize="none"
              />
            </YStack>

            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">
                {t('profile.location')}
              </Text>
              <YStack gap="$2">
                <DropdownButton
                  onPress={() => {
                    // Search for nearby locations first, then show sheet
                    if (!formData.location) {
                      handleLocationSearch('');
                    }
                    showLocationSheet();
                  }}
                  value={formData.location}
                  placeholder="Select Your Location"
                  isActive={showLocationDrawer}
                />
                
              </YStack>
            </YStack>

            <DropdownButton
              onPress={showRoleSheet}
              value={formData.role === 'student'
                ? t('profile.roles.student')
                : formData.role === 'instructor'
                  ? t('profile.roles.instructor')
                  : t('profile.roles.school')}
              placeholder={t('profile.selectRole') || 'Select Role'}
              isActive={showRoleModal}
            />

            <DropdownButton
              onPress={showExperienceSheet}
              value={formData.experience_level === 'beginner'
                ? t('profile.experienceLevels.beginner')
                : formData.experience_level === 'intermediate'
                  ? t('profile.experienceLevels.intermediate')
                  : t('profile.experienceLevels.advanced')}
              placeholder="Select Experience Level"
              isActive={showExperienceModal}
            />

            <DropdownButton
              onPress={showLanguageSheet}
              value={LANGUAGE_LABELS[language]}
              placeholder={t('profile.selectLanguage') || 'Select Language'}
              isActive={showLanguageModal}
            />

            {/* Private Profile Setting */}
            <XStack
              justifyContent="space-between"
              alignItems="center"
              backgroundColor={formData.private_profile ? '$blue4' : undefined}
              padding="$4"
              borderRadius="$4"
              pressStyle={{
                scale: 0.98,
              }}
              onPress={async () => {
                const newValue = !formData.private_profile;
                setFormData((prev) => ({ ...prev, private_profile: newValue }));
                // Auto-save private profile setting
                if (user) {
                  try {
                    await updateProfile({ private_profile: newValue });
                    console.log('✅ Private profile setting updated:', newValue);
                  } catch (error) {
                    console.error('Error saving private profile setting:', error);
                  }
                }
              }}
            >
              <Text size="lg" color="$color">
                {t('profile.privateProfile')}
              </Text>
              <Switch
                size="$6"
                checked={formData.private_profile}
                onCheckedChange={async (checked) => {
                  setFormData((prev) => ({ ...prev, private_profile: checked }));
                  // Auto-save private profile setting
                  if (user) {
                    try {
                      await updateProfile({ private_profile: checked });
                      console.log('✅ Private profile setting updated:', checked);
                    } catch (error) {
                      console.error('Error saving private profile setting:', error);
                    }
                  }
                }}
                backgroundColor={formData.private_profile ? '$blue8' : '$gray6'}
                scale={1.2}
                margin="$2"
                pressStyle={{
                  scale: 0.95,
                }}
              >
                <Switch.Thumb
                  scale={1.2}
                  pressStyle={{
                    scale: 0.95,
                  }}
                />
              </Switch>
            </XStack>

            {/* Notification Settings */}
            <YStack marginVertical="$2">
              <DropdownButton
                onPress={showNotificationSheet}
                value={t('profile.notificationSettings') || 'Notification Settings'}
                placeholder="Notification Settings"
              />
            </YStack>

            {/* Theme Settings */}
            <YStack marginVertical="$2">
              <DropdownButton
                onPress={showThemeSheet}
                value={t('profile.themeSettings') || 'Theme Settings'}
                placeholder="Theme Settings"
              />
            </YStack>

            {/* Developer Tools (Combined Testing & Developer Options) - Only show if developer mode enabled */}
            {(profile as any)?.developer_mode && (
              <YStack marginVertical="$2">
                <DropdownButton
                  onPress={showDeveloperSheet}
                  value="Developer Tools"
                  placeholder="Developer Tools"
                />
              </YStack>
            )}

            {error ? (
              <Text size="sm" intent="error" textAlign="center">
                {error}
              </Text>
            ) : null}

            {/* Körkortsplan */}
            <YStack marginVertical="$2">
              <DropdownButton
                onPress={showKorkortsplanSheet}
                value="Körkortsplan"
                placeholder="Körkortsplan"
              />
            </YStack>

            {/* Save Button */}
            <Button
              onPress={async () => {
                try {
                  setLoading(true);
                  await updateProfile(formData);
                  console.log('✅ Profile saved successfully');
                  showToast({
                    title: t('profile.saved') || 'Saved',
                    message: t('profile.profileUpdated') || 'Profile updated successfully',
                    type: 'success'
                  });
                } catch (error) {
                  console.error('Error saving profile:', error);
                  showToast({
                    title: t('common.error') || 'Error',
                    message: t('profile.failedToSave') || 'Failed to save profile',
                    type: 'error'
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="primary"
              size="lg"
              marginTop="$4"
            >
              {loading ? (t('common.saving') || 'Saving...') : (t('profile.save') || 'Save Profile')}
            </Button>
              </YStack>
            )}

            {/* Account Actions */}
            <YStack gap="$3" marginTop="$4">
              <Button 
                onPress={handleSignOut} 
                disabled={loading} 
                variant="outlined" 
                size="lg"
              >
                {t('profile.signOut')}
              </Button>
              <Button
                onPress={showDeleteSheet}
                disabled={loading}
                variant="outlined"
                size="lg"
              >
                {t('settings.deleteAccount') || 'Delete Account'}
              </Button>
            </YStack>

            {/* Relationships Tab */}
            {activeTab === 'relationships' && (
              <YStack gap="$4">
                {/* Supervised Students Section for Supervisors */}
            {canSuperviseStudents() && (
              <Card bordered padding="$4" marginVertical="$2">
                <YStack gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text size="lg" weight="bold" color="$color">
                      Supervised Students
                    </Text>
                    <XStack gap="$2">
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$green9"
                        onPress={handleOpenRelationshipModal}
                      >
                        <Text color="white">
                          {activeStudentId ? 'Switch Student' : 'Select Student'}
                        </Text>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$purple9"
                        onPress={() => navigation.navigate('StudentManagementScreen')}
                      >
                        <Text color="white">{t('profile.manageStudents') || 'Manage Students'}</Text>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$blue9"
                        onPress={() => {
                          setInviteType('student');
                          setShowInviteModal(true);
                        }}
                      >
                        <Text color="white">{t('profile.inviteStudents') || 'Invite Students'}</Text>
                      </Button>
                    </XStack>
                  </XStack>

                  {activeStudentId ? (
                    <YStack gap="$1">
                      <Text color="$green11" size="sm">
                        Active View: {getActiveUser().full_name}
                      </Text>
                      <Text color="$gray11" size="xs">
                        You can see this student's progress, routes, and exercises
                      </Text>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$gray7"
                        onPress={() => switchActiveStudent(null)}
                        marginTop="$1"
                      >
                        <Text>{t('profile.switchBackToMyView') || 'Switch Back to My View'}</Text>
                      </Button>
                    </YStack>
                  ) : supervisedStudents.length > 0 ? (
                    <YStack gap="$1">
                      <Text color="$gray11" size="sm">
                        Managing {supervisedStudents.length} student
                        {supervisedStudents.length !== 1 ? 's' : ''} • Currently viewing your own
                        profile
                      </Text>
                      <Text color="$gray11" size="xs">
                        Select a student above to view their progress and help with their exercises
                      </Text>
                    </YStack>
                  ) : (
                    <YStack gap="$1">
                      <Text color="$gray11" size="sm">
                        No supervised students yet
                      </Text>
                      <Text color="$gray11" size="xs">
                        Invite students to supervise their learning journey
                      </Text>
                    </YStack>
                  )}
                </YStack>
              </Card>
            )}

            {/* Supervisors Section - Show for students and instructors */}
            {(profile?.role === 'student' || profile?.role === 'instructor') && (
            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text size="lg" weight="bold" color="$color">
                    {t('profile.supervisors') || 'Supervisors'}
                  </Text>
                  <XStack gap="$2">
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="$blue9"
                      onPress={handleOpenRelationshipModal}
                      disabled={relationshipsLoading}
                    >
                      <Text color="white">
                        {supervisors.length > 0 ? 'Manage' : 'Request Supervisors'}
                      </Text>
                    </Button>
                    {profile?.role === 'student' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="$green9"
                      onPress={() => {
                        setInviteType('supervisor');
                        setShowInviteModal(true);
                      }}
                    >
                      <Text color="white">Invite Supervisors</Text>
                    </Button>
                    )}
                  </XStack>
                </XStack>

                {supervisors.length === 0 ? (
                  <Text color="$gray11" size="sm">
                    No supervisors assigned yet. Click "Add Supervisors" to get started.
                  </Text>
                ) : (
                  supervisors.map((supervisor) => (
                    <XStack
                      key={supervisor.supervisor_id}
                      justifyContent="space-between"
                      alignItems="center"
                      backgroundColor="$backgroundHover"
                      padding="$3"
                      borderRadius="$3"
                    >
                      <YStack flex={1}>
                        <Text weight="bold" color="$color">
                          {supervisor.supervisor_name || 'Unknown Supervisor'}
                        </Text>
                        {supervisor.supervisor_email && (
                          <Text color="$gray11" size="sm">
                            {supervisor.supervisor_email}
                          </Text>
                        )}
                        {supervisor.relationship_created && (
                          <Text color="$gray11" size="xs">
                            Supervising since {new Date(supervisor.relationship_created).toLocaleDateString()} at {new Date(supervisor.relationship_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </YStack>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$red9"
                        onPress={() => {
                          setRemovalTargetSupervisor({
                            id: supervisor.supervisor_id,
                            name: supervisor.supervisor_name || 'Unknown Supervisor',
                            email: supervisor.supervisor_email || '',
                          });
                          setShowRemovalReviewModal(true);
                        }}
                        disabled={relationshipsLoading}
                      >
                        <Text color="white">{t('common.leave') || 'Leave'}</Text>
                      </Button>
                    </XStack>
                  ))
                )}
              </YStack>
            </Card>
            )}

            {/* Schools Section - ALWAYS SHOW */}
            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text size="lg" weight="bold" color="$color">
                    {t('profile.schools') || 'Schools'}
                  </Text>
                  <Button
                    size="sm"
                    variant="secondary"
                    backgroundColor="$blue9"
                    onPress={() => {
                      fetchAvailableSchools();
                      setShowSchoolModal(true);
                    }}
                    disabled={relationshipsLoading}
                  >
                    <Text color="white">
                      {schools.length > 0 ? 'Change School' : 'Join School'}
                    </Text>
                  </Button>
                </XStack>

                {schools.length === 0 ? (
                  <Text color="$gray11" size="sm">
                    Not a member of any school yet. Click "Join School" to see all available
                    schools.
                  </Text>
                ) : (
                  schools.map((school) => (
                    <XStack
                      key={school.school_id}
                      justifyContent="space-between"
                      alignItems="center"
                      backgroundColor="$backgroundHover"
                      padding="$3"
                      borderRadius="$3"
                    >
                      <YStack flex={1}>
                        <Text weight="bold" color="$color">
                          {school.school_name || 'Unknown School'}
                        </Text>
                        {school.school_location && (
                          <Text color="$gray11" size="sm">
                            {school.school_location}
                          </Text>
                        )}
                      </YStack>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$red9"
                        onPress={() => {
                          Alert.alert(
                            'Leave School',
                            `Are you sure you want to leave ${school.school_name}?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Leave',
                                style: 'destructive',
                                onPress: () => leaveSchool(school.school_id),
                              },
                            ],
                          );
                        }}
                        disabled={relationshipsLoading}
                      >
                        <Text color="white">{t('common.leave') || 'Leave'}</Text>
                      </Button>
                    </XStack>
                  ))
                )}
              </YStack>
            </Card>

            {/* Relationship Reviews Section */}
            {profile && (
              <RelationshipReviewSection
                profileUserId={profile.id}
                profileUserRole={profile.role as any}
                profileUserName={profile.full_name || profile.email || 'Unknown User'}
                canReview={userRating.canReview}
                reviews={relationshipReviews}
                onReviewAdded={loadRelationshipReviews}
              />
            )}
              </YStack>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <YStack gap="$4">
                {/* Current Subscription */}
                <Card bordered padding="$4" marginVertical="$2">
                  <YStack gap="$3">
                    <Text size="lg" weight="bold" color="$color">
                      {t('profile.billing.currentPlan') || 'Current Plan'}
                    </Text>
                    <Card padding="$3" backgroundColor="$blue4" borderRadius="$3">
                      <YStack alignItems="center" gap="$2">
                        <Text fontSize="$6" fontWeight="bold" color="$blue11">
                          {t('profile.billing.freePlan') || 'Free Plan'}
                        </Text>
                        <Text fontSize="$3" color="$blue11" textAlign="center">
                          {t('profile.billing.basicAccess') || 'Basic access to learning paths'}
                        </Text>
                        <Text fontSize="$2" color="$blue11" textAlign="center">
                          {t('profile.billing.upgradeForMore') || 'Upgrade for unlimited access and premium features'}
                        </Text>
                      </YStack>
                    </Card>
                  </YStack>
                </Card>

                {/* Subscription Plans */}
                <Card bordered padding="$4" marginVertical="$2">
                  <YStack gap="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text size="lg" weight="bold" color="$color">
                        {t('profile.billing.availablePlans') || 'Available Plans'}
                      </Text>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$blue9"
                        onPress={fetchSubscriptionPlans}
                        disabled={billingLoading}
                      >
                        <Feather
                          name={billingLoading ? 'loader' : 'refresh-cw'}
                          size={14}
                          color="white"
                        />
                        <Text color="white" ml="$1">
                          {billingLoading ? 'Loading...' : 'Refresh'}
                        </Text>
                      </Button>
                    </XStack>

                    {subscriptionPlans.length === 0 ? (
                      <YStack alignItems="center" padding="$4" gap="$2">
                        <Feather name="credit-card" size={48} color="$gray11" />
                        <Text color="$gray11" textAlign="center">
                          {t('profile.billing.noPlans') || 'No subscription plans available'}
                        </Text>
                        <Button
                          size="sm"
                          variant="secondary"
                          backgroundColor="$blue9"
                          onPress={fetchSubscriptionPlans}
                          marginTop="$2"
                        >
                          <Text color="white">{t('profile.billing.loadPlans') || 'Load Plans'}</Text>
                        </Button>
                      </YStack>
                    ) : (
                      <YStack gap="$3">
                        {subscriptionPlans.map((plan) => {
                          const isCurrent = plan.name === 'Free Plan'; // For now, assume everyone is on free plan
                          const isEnterprise = plan.name === 'Enterprise Plan';
                          const isPro = plan.name === 'Pro Plan';
                          
                          return (
                            <Card 
                              key={plan.id} 
                              padding="$4" 
                              backgroundColor={isCurrent ? '$green4' : isPro ? '$blue4' : isEnterprise ? '$purple4' : '$backgroundHover'}
                              borderRadius="$3"
                              borderWidth={isCurrent ? 2 : 1}
                              borderColor={isCurrent ? '$green8' : isPro ? '$blue8' : isEnterprise ? '$purple8' : '$borderColor'}
                            >
                              <YStack gap="$2">
                                <XStack justifyContent="space-between" alignItems="center">
                                  <Text fontSize="$5" fontWeight="bold" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$color'}>
                                    {plan.name}
                                  </Text>
                                  {isCurrent && (
                                    <XStack
                                      backgroundColor="$green8"
                                      paddingHorizontal={8}
                                      paddingVertical={4}
                                      borderRadius={12}
                                      alignItems="center"
                                      gap={4}
                                    >
                                      <Feather name="check" size={14} color="white" />
                                      <Text fontSize={12} color="white" fontWeight="bold">
                                        {t('profile.billing.current') || 'Current'}
                                      </Text>
                                    </XStack>
                                  )}
                                </XStack>
                                
                                <Text fontSize="$3" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$gray11'}>
                                  {plan.description}
                                </Text>
                                
                                <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
                                  <YStack>
                                    <Text fontSize="$6" fontWeight="bold" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$color'}>
                                      ${plan.price_amount.toFixed(2)}
                                    </Text>
                                    <Text fontSize="$2" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$gray11'}>
                                      {t('profile.billing.perMonth') || 'per month'}
                                    </Text>
                                  </YStack>
                                  
                                  {!isCurrent && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      backgroundColor={isPro ? '$blue9' : isEnterprise ? '$purple9' : '$green9'}
                                      onPress={() => {
                                        // TODO: Implement subscription upgrade
                                        showToast({
                                          title: t('profile.billing.upgradeTitle') || 'Upgrade Plan',
                                          message: `${t('profile.billing.upgradeMessage') || 'Upgrade to'} ${plan.name}`,
                                          type: 'info'
                                        });
                                      }}
                                    >
                                      <Text color="white">
                                        {t('profile.billing.upgrade') || 'Upgrade'}
                                      </Text>
                                    </Button>
                                  )}
                                </XStack>
                                
                                {/* Features */}
                                {plan.features && (
                                  <YStack gap="$1" marginTop="$2">
                                    <Text fontSize="$3" fontWeight="600" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$color'}>
                                      {t('profile.billing.features') || 'Features:'}
                                    </Text>
                                    {Object.entries(plan.features as any).map(([key, value]) => (
                                      <XStack key={key} alignItems="center" gap="$2">
                                        <Feather 
                                          name={value ? "check" : "x"} 
                                          size={12} 
                                          color={value ? (isCurrent ? '#10b981' : isPro ? '#3b82f6' : isEnterprise ? '#8b5cf6' : '#10b981') : '#ef4444'} 
                                        />
                                        <Text fontSize="$2" color={isCurrent ? '$green11' : isPro ? '$blue11' : isEnterprise ? '$purple11' : '$gray11'}>
                                          {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                                        </Text>
                                      </XStack>
                                    ))}
                                  </YStack>
                                )}
                              </YStack>
                            </Card>
                          );
                        })}
                      </YStack>
                    )}
                  </YStack>
                </Card>

                {/* Payment History */}
                <Card bordered padding="$4" marginVertical="$2">
                  <YStack gap="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text size="lg" weight="bold" color="$color">
                        {t('profile.billing.paymentHistory') || 'Payment History'}
                      </Text>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$blue9"
                        onPress={fetchPaymentHistory}
                      >
                        <Feather name="refresh-cw" size={14} color="white" />
                        <Text color="white" ml="$1">
                          {t('common.refresh') || 'Refresh'}
                        </Text>
                      </Button>
                    </XStack>

                    {paymentHistory.length === 0 ? (
                      <YStack alignItems="center" padding="$4" gap="$2">
                        <Feather name="file-text" size={48} color="$gray11" />
                        <Text color="$gray11" textAlign="center">
                          {t('profile.billing.noPayments') || 'No payment history yet'}
                        </Text>
                        <Text color="$gray11" fontSize="$3" textAlign="center">
                          {t('profile.billing.paymentsWillAppear') || 'Your payments will appear here'}
                        </Text>
                      </YStack>
                    ) : (
                      <YStack gap="$2">
                        {paymentHistory.map((payment) => (
                          <Card 
                            key={payment.id} 
                            padding="$3" 
                            backgroundColor="$backgroundHover" 
                            borderRadius="$3"
                          >
                            <XStack justifyContent="space-between" alignItems="center">
                              <YStack flex={1}>
                                <Text fontWeight="bold" color="$color">
                                  {payment.description || t('profile.billing.unknownPayment') || 'Unknown Payment'}
                                </Text>
                                <Text fontSize="$3" color="$gray11">
                                  {new Date(payment.created_at).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US')} • {payment.payment_method}
                                </Text>
                                <Text fontSize="$2" color="$gray11">
                                  ID: {payment.payment_provider_id || payment.id}
                                </Text>
                              </YStack>
                              <YStack alignItems="flex-end">
                                <Text fontSize="$4" fontWeight="bold" color="$color">
                                  ${payment.amount.toFixed(2)} {payment.currency}
                                </Text>
                                <XStack
                                  backgroundColor={payment.status === 'completed' ? '$green8' : payment.status === 'pending' ? '$orange8' : '$red8'}
                                  paddingHorizontal={8}
                                  paddingVertical={2}
                                  borderRadius={8}
                                  alignItems="center"
                                >
                                  <Text fontSize={10} color="white" fontWeight="bold">
                                    {payment.status === 'completed' ? (t('profile.billing.completed') || 'Completed') :
                                     payment.status === 'pending' ? (t('profile.billing.pending') || 'Pending') :
                                     (t('profile.billing.failed') || 'Failed')}
                                  </Text>
                                </XStack>
                              </YStack>
                            </XStack>
                          </Card>
                        ))}
                      </YStack>
                    )}
                  </YStack>
                </Card>
              </YStack>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <YStack gap="$4">
                {/* Driving Statistics Section */}
            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text size="lg" weight="bold" color="$color">
                    {t('profile.stats.title') || 'Driving Statistics'}
                  </Text>
                  <Button
                    size="sm"
                    variant="secondary"
                    backgroundColor="$blue9"
                    onPress={fetchDrivingStats}
                    disabled={statsLoading}
                  >
                    <Feather
                      name={statsLoading ? 'loader' : 'refresh-cw'}
                      size={14}
                      color="white"
                    />
                    <Text color="white" ml="$1">
                      {statsLoading ? 'Loading...' : 'Refresh'}
                    </Text>
                  </Button>
                </XStack>

                {drivingStats ? (
                  <YStack gap="$4">
                    {/* Summary Stats */}
                    <XStack gap="$2" flexWrap="wrap">
                      <Card flex={1} padding="$3" backgroundColor="$blue4" borderRadius="$3">
                        <YStack alignItems="center">
                          <Text fontSize="$6" fontWeight="bold" color="$blue11">
                            {drivingStats.totalRoutes}
                          </Text>
                          <Text fontSize="$2" color="$blue11" textAlign="center">
                            {t('profile.stats.totalRoutes') || 'Total Routes'}
                          </Text>
                        </YStack>
                      </Card>

                      <Card flex={1} padding="$3" backgroundColor="$green4" borderRadius="$3">
                        <YStack alignItems="center">
                          <Text fontSize="$6" fontWeight="bold" color="$green11">
                            {drivingStats.totalDistance.toFixed(1)}
                          </Text>
                          <Text fontSize="$2" color="$green11" textAlign="center">
                            km this week
                          </Text>
                        </YStack>
                      </Card>

                      <Card flex={1} padding="$3" backgroundColor="$orange4" borderRadius="$3">
                        <YStack alignItems="center">
                          <Text fontSize="$6" fontWeight="bold" color="$orange11">
                            {Math.round(drivingStats.totalTime / 60)}h
                          </Text>
                          <Text fontSize="$2" color="$orange11" textAlign="center">
                            {Math.round(drivingStats.totalTime % 60)}m total
                          </Text>
                        </YStack>
                      </Card>
                    </XStack>

                    {/* Weekly Distance Chart */}
                    <YStack gap="$2">
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {t('profile.stats.weeklyDistance') || '📏 Weekly Distance'}
                      </Text>
                      <BarChart
                        data={{
                          labels: drivingStats.weeklyData.map((day) => day.day),
                          datasets: [
                            {
                              data: drivingStats.weeklyData.map((day) => day.distance),
                            },
                          ],
                        }}
                        width={Dimensions.get('window').width - 80}
                        height={120}
                        yAxisLabel=""
                        yAxisSuffix="km"
                        chartConfig={{
                          backgroundColor: '#1A1A1A',
                          backgroundGradientFrom: '#1A1A1A',
                          backgroundGradientTo: '#1A1A1A',
                          decimalPlaces: 1,
                          color: (opacity = 1) => `rgba(0, 230, 195, ${opacity})`,
                          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                          style: { borderRadius: 8 },
                          propsForBackgroundLines: {
                            strokeDasharray: '',
                            stroke: '#333',
                            strokeWidth: 1,
                          },
                        }}
                        style={{
                          marginVertical: 8,
                          borderRadius: 8,
                        }}
                        showValuesOnTopOfBars
                        fromZero
                      />
                      <Text fontSize="$2" color="$gray11" textAlign="center">
                        Average: {drivingStats.averagePerDay.distance.toFixed(1)}{' '}
                        {t('profile.stats.kmPerDay') || 'km per day'}
                      </Text>
                    </YStack>

                    {/* Weekly Time Chart */}
                    <YStack gap="$2">
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {t('profile.stats.weeklyTime') || 'Weekly Time'}
                      </Text>
                      <BarChart
                        data={{
                          labels: drivingStats.weeklyData.map((day) => day.day),
                          datasets: [
                            {
                              data: drivingStats.weeklyData.map((day) => day.time / 60), // Convert to hours
                            },
                          ],
                        }}
                        width={Dimensions.get('window').width - 80}
                        height={120}
                        yAxisLabel=""
                        yAxisSuffix="h"
                        chartConfig={{
                          backgroundColor: '#1A1A1A',
                          backgroundGradientFrom: '#1A1A1A',
                          backgroundGradientTo: '#1A1A1A',
                          decimalPlaces: 1,
                          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Orange color
                          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                          style: { borderRadius: 8 },
                          propsForBackgroundLines: {
                            strokeDasharray: '',
                            stroke: '#333',
                            strokeWidth: 1,
                          },
                        }}
                        style={{
                          marginVertical: 8,
                          borderRadius: 8,
                        }}
                        showValuesOnTopOfBars
                        fromZero
                      />
                      <Text fontSize="$2" color="$gray11" textAlign="center">
                        Average: {(drivingStats.averagePerDay.time / 60).toFixed(1)}{' '}
                        {t('profile.stats.hoursPerDay') || 'hours per day'}
                      </Text>
                    </YStack>

                    {/* Most Active Day */}
                    <Card padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <XStack alignItems="center" justifyContent="center" gap="$2">
                        <Feather name="calendar" size={16} color="#00E6C3" />
                        <Text color="$color" fontWeight="500">
                          {t('profile.stats.mostActiveDays') || 'Most Active Day'}:
                        </Text>
                        <Text color="$color" fontWeight="bold">
                          {drivingStats.mostActiveDay}
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          (
                          {drivingStats.weeklyData.find((d) => d.day === drivingStats.mostActiveDay)
                            ?.routes || 0}{' '}
                          routes)
                        </Text>
                      </XStack>
                    </Card>
                  </YStack>
                ) : (
                  <YStack alignItems="center" padding="$4" gap="$2">
                    <Feather name="bar-chart-2" size={48} color="$gray11" />
                    <Text color="$gray11" textAlign="center">
                      No driving data available yet
                    </Text>
                    <Text color="$gray11" fontSize="$3" textAlign="center">
                      Start recording routes to see your statistics
                    </Text>
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="$blue9"
                      onPress={fetchDrivingStats}
                      marginTop="$2"
                    >
                      <Text color="white">{t('profile.checkForData') || 'Check for Data'}</Text>
                    </Button>
                  </YStack>
                )}
              </YStack>
            </Card>
              </YStack>
            )}

          </YStack>
        </YStack>
      </YStack>

      {/* Delete Account Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showDeleteDialog}
        onRequestClose={hideDeleteSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: deleteBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Pressable style={{ flex: 1, width: '100%' }} onPress={hideDeleteSheet} />
            <Animated.View
              style={{
                backgroundColor: '$background',
                borderRadius: 20,
                padding: 20,
                width: '90%',
                maxWidth: 400,
                maxHeight: '80%',
                transform: [{ scale: deleteModalScale }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <YStack gap="$4">
                  {/* Header */}
                  <Text size="xl" weight="bold" color="$color" textAlign="center">
                    {t('deleteAccount.title') || 'Delete Account'}
                  </Text>

                  <Text color="$gray11" textAlign="center">
                    {t('deleteAccount.description') ||
                      'Deleting your account will anonymize your profile. Your content remains unless you choose to remove it below.'}
                  </Text>

                  <YStack gap="$4" marginTop="$4">
                    {/* Delete Options */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('deleteAccount.deleteOptions') || 'What would you like to delete?'}
                      </Text>
                      
                      <XStack ai="center" jc="space-between">
                        <Text>{t('deleteAccount.deletePrivateRoutes') || 'Delete my private routes'}</Text>
                        <Switch 
                          size="$4"
                          checked={optDeletePrivate} 
                          onCheckedChange={setOptDeletePrivate}
                          backgroundColor={optDeletePrivate ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                      
                      <XStack ai="center" jc="space-between">
                        <Text>{t('deleteAccount.deletePublicRoutes') || 'Delete my public routes'}</Text>
                        <Switch 
                          size="$4"
                          checked={optDeletePublic} 
                          onCheckedChange={setOptDeletePublic}
                          backgroundColor={optDeletePublic ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                      
                      <XStack ai="center" jc="space-between">
                        <Text>{t('deleteAccount.deleteEvents') || 'Delete my events'}</Text>
                        <Switch 
                          size="$4"
                          checked={optDeleteEvents} 
                          onCheckedChange={setOptDeleteEvents}
                          backgroundColor={optDeleteEvents ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                      
                      <XStack ai="center" jc="space-between">
                        <Text>{t('deleteAccount.deleteExercises') || 'Delete my user exercises'}</Text>
                        <Switch 
                          size="$4"
                          checked={optDeleteExercises} 
                          onCheckedChange={setOptDeleteExercises}
                          backgroundColor={optDeleteExercises ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                      
                      <XStack ai="center" jc="space-between">
                        <Text>{t('deleteAccount.deleteReviews') || 'Delete my reviews'}</Text>
                        <Switch 
                          size="$4"
                          checked={optDeleteReviews} 
                          onCheckedChange={setOptDeleteReviews}
                          backgroundColor={optDeleteReviews ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                      
                    </YStack>

                    {/* Transfer Option */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('deleteAccount.transferToggle') || 'Transfer public content to system account'}
                      </Text>
                      <XStack ai="center" gap="$2">
                        <Switch 
                          size="$4"
                          checked={optTransferPublic} 
                          onCheckedChange={setOptTransferPublic}
                          backgroundColor={optTransferPublic ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                        <Text size="md" color="$color">
                          {optTransferPublic ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                        </Text>
                      </XStack>
                      <Text color="$gray11" fontSize="$2">
                        {t('deleteAccount.transferHelp') ||
                          'If off, public content will be deleted if that option is selected.'}
                      </Text>
                    </YStack>
                  </YStack>

                  <YStack gap="$2" marginTop="$4">
                    <Button 
                      variant="primary"
                      backgroundColor="$red9"
                      size="lg" 
                      onPress={handleConfirmDeleteAccount}
                    >
                      <Text color="white">{t('deleteAccount.confirm') || 'Delete my account'}</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onPress={hideDeleteSheet}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                  </YStack>
                </YStack>
              </ScrollView>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      <Modal
        visible={showRoleModal}
        transparent
        animationType="none"
        onRequestClose={hideRoleSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: roleBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideRoleSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: roleSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {t('profile.roles.title')}
                </Text>
                <YStack gap="$2">
                  {USER_ROLES.map((role) => (
                    <RadioButton
                      key={role}
                      onPress={() => {
                        setFormData((prev) => ({ ...prev, role: role as UserRole }));
                        hideRoleSheet();
                        updateProfile({
                          role: role as UserRole,
                          role_confirmed: true,
                        });
                      }}
                      title={role === 'student'
                        ? t('profile.roles.student')
                        : role === 'instructor'
                          ? t('profile.roles.instructor')
                          : t('profile.roles.school')}
                      isSelected={formData.role === role}
                    />
                  ))}
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      <Modal
        visible={showExperienceModal}
        transparent
        animationType="none"
        onRequestClose={hideExperienceSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: experienceBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideExperienceSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: experienceSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {t('profile.experienceLevels.title')}
                </Text>
                <YStack gap="$2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <RadioButton
                      key={level}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          experience_level: level as ExperienceLevel,
                        }));
                        hideExperienceSheet();
                        updateProfile({
                          experience_level: level as ExperienceLevel,
                        });
                      }}
                      title={level === 'beginner'
                        ? t('profile.experienceLevels.beginner')
                        : level === 'intermediate'
                          ? t('profile.experienceLevels.intermediate')
                          : t('profile.experienceLevels.advanced')}
                      isSelected={formData.experience_level === level}
                    />
                  ))}
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="none"
        onRequestClose={hideLanguageSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: languageBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideLanguageSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: languageSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {t('settings.language.title')}
                </Text>
                <YStack gap="$2">
                  {LANGUAGES.map((lang) => (
                    <RadioButton
                      key={lang}
                      onPress={async () => {
                        await setLanguage(lang);
                        hideLanguageSheet();
                      }}
                      title={LANGUAGE_LABELS[lang]}
                      isSelected={language === lang}
                    />
                  ))}
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Supervisor Selection Modal */}
      <Modal
        visible={showSupervisorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSupervisorModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowSupervisorModal(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
            maxHeight="80%"
          >
            <Text size="xl" weight="bold" color="$color">
              {t('profile.selectSupervisors') || 'Select Supervisors'}
            </Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
              <YStack gap="$2">
                {availableSupervisors.map((supervisor) => {
                  const isSelected = selectedSupervisorIds.includes(supervisor.id);
                  return (
                    <Button
                      key={supervisor.id}
                      onPress={() => {
                        setSelectedSupervisorIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== supervisor.id)
                            : [...prev, supervisor.id],
                        );
                      }}
                      variant={isSelected ? 'primary' : 'secondary'}
                      backgroundColor={isSelected ? '$blue10' : undefined}
                      size="lg"
                    >
                      <YStack alignItems="flex-start" width="100%">
                        <Text color={isSelected ? 'white' : '$color'} fontWeight="bold">
                          {supervisor.full_name}
                        </Text>
                        {supervisor.email && (
                          <Text color={isSelected ? 'white' : '$gray11'} fontSize="$3">
                            {supervisor.email}
                          </Text>
                        )}
                      </YStack>
                    </Button>
                  );
                })}
              </YStack>
            </ScrollView>

            <XStack gap="$2">
              <Button
                flex={1}
                onPress={() => setShowSupervisorModal(false)}
                variant="secondary"
                backgroundColor="$backgroundHover"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                flex={1}
                onPress={joinSupervisors}
                variant="primary"
                backgroundColor="$blue10"
                disabled={selectedSupervisorIds.length === 0}
              >
                {t('profile.addSelected') || 'Add Selected'}
              </Button>
            </XStack>
          </YStack>
        </Pressable>
      </Modal>

      {/* School Selection Modal */}
      <Modal
        visible={showSchoolModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSchoolModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowSchoolModal(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
            maxHeight="80%"
          >
            <Text size="xl" weight="bold" color="$color">
              {t('profile.selectSchool') || 'Select School'}
            </Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
              <YStack gap="$2">
                {availableSchools.length === 0 ? (
                  <YStack padding="$4" alignItems="center">
                    <Text color="$gray11" textAlign="center">
                      🏫 No schools available
                    </Text>
                    <Text color="$gray11" fontSize="$3" textAlign="center" marginTop="$2">
                      Check console for debugging info
                    </Text>
                    <Button
                      size="sm"
                      variant="secondary"
                      marginTop="$2"
                      onPress={() => {
                        console.log('🏫 Manual refresh triggered');
                        fetchAvailableSchools();
                      }}
                    >
                      Refresh Schools
                    </Button>
                  </YStack>
                ) : (
                  availableSchools.map((school) => {
                    console.log('🏫 Rendering school:', school);
                    return (
                      <Button
                        key={school.id}
                        onPress={() => joinSchool(school.id)}
                        variant="secondary"
                        size="lg"
                      >
                        <YStack alignItems="flex-start" width="100%">
                          <Text color="$color" fontWeight="bold">
                            {school.name}
                          </Text>
                          {school.location && (
                            <Text color="$gray11" fontSize="$3">
                              {school.location}
                            </Text>
                          )}
                        </YStack>
                      </Button>
                    );
                  })
                )}
              </YStack>
            </ScrollView>

            <Button
              onPress={() => setShowSchoolModal(false)}
              variant="secondary"
              backgroundColor="$backgroundHover"
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      {/* Invitation Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowInviteModal(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
            maxHeight="80%"
          >
            <Text size="xl" weight="bold" color="$color">
              {inviteType === 'supervisor' ? 'Invite Supervisor' : 'Invite Students'}
            </Text>
            <Text color="$gray11" size="sm">
              {inviteType === 'supervisor'
                ? 'Search existing users or enter email addresses to invite new supervisors'
                : 'Search existing users or enter email addresses to invite new students'}
            </Text>
            
            {/* Toggle between search and email invite */}
            <XStack gap="$2" justifyContent="center">
              <Button
                size="sm"
                variant={inviteEmails.length === 0 ? 'primary' : 'secondary'}
                onPress={() => setInviteEmails([])}
              >
                <Text color={inviteEmails.length === 0 ? 'white' : '$color'}>{t('profile.searchExisting') || 'Search Existing'}</Text>
              </Button>
              <Button
                size="sm"
                variant={inviteEmails.length > 0 ? 'primary' : 'secondary'}
                onPress={() => {
                  setInviteEmails(['']);
                  setInvitePasswords(['']);
                  setSearchResults([]);
                }}
              >
                <Text color={inviteEmails.length > 0 ? 'white' : '$color'}>{t('profile.inviteNew') || 'Invite New'}</Text>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  fetchPendingInvitations();
                  setShowPendingInvites(!showPendingInvites);
                }}
              >
                <Text color="$color">{t('profile.pending') || 'Pending'} ({pendingInvitations.length})</Text>
              </Button>
            </XStack>

            {/* Email invite mode */}
            {inviteEmails.length > 0 ? (
              <YStack gap="$2">
                <Text size="sm" color="$gray11">{t('profile.enterEmailsInstructions') || 'Enter email addresses and passwords (leave password blank for auto-generated)'}</Text>
                
                {/* Custom message field */}
                <YStack gap="$1">
                  <Text size="sm" color="$gray11">{t('profile.personalMessage') || 'Optional personal message:'}</Text>
                  <Input
                    value={inviteCustomMessage}
                    onChangeText={setInviteCustomMessage}
                    placeholder="Add a personal message to your invitation..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </YStack>
                {inviteEmails.map((email, index) => (
                  <YStack key={index} gap="$1">
                    <XStack gap="$2">
                      <Input
                        flex={1}
                        value={email}
                        onChangeText={(text) => {
                          const newEmails = [...inviteEmails];
                          newEmails[index] = text;
                          setInviteEmails(newEmails);
                        }}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          const newEmails = inviteEmails.filter((_, i) => i !== index);
                          const newPasswords = invitePasswords.filter((_, i) => i !== index);
                          setInviteEmails(newEmails.length > 0 ? newEmails : ['']);
                          setInvitePasswords(newPasswords.length > 0 ? newPasswords : ['']);
                        }}
                      >
                        <Feather name="x" size={16} />
                      </Button>
                    </XStack>
                    <Input
                      value={invitePasswords[index] || ''}
                      onChangeText={(text) => {
                        const newPasswords = [...invitePasswords];
                        newPasswords[index] = text;
                        setInvitePasswords(newPasswords);
                      }}
                      placeholder="Custom password (optional)"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </YStack>
                ))}
                <XStack gap="$2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      setInviteEmails([...inviteEmails, '']);
                      setInvitePasswords([...invitePasswords, '']);
                    }}
                  >
                    <Text>Add Another Email</Text>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    backgroundColor="$green9"
                    onPress={() => handleBulkInvite()}
                    disabled={!inviteEmails.some(e => e.includes('@'))}
                  >
                    <Text color="white">Send {inviteEmails.filter(e => e.includes('@')).length} Invitation(s)</Text>
                  </Button>
                </XStack>
              </YStack>
            ) : (
              /* Search existing users mode */
              <XStack gap="$2">
                <Input
                  flex={1}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchUsers(text);
                  }}
                  placeholder="Search by name or email..."
                  autoCapitalize="none"
                />
                <Button
                  onPress={() => searchUsers(searchQuery)}
                  disabled={searchLoading}
                  variant="secondary"
                >
                  <Feather name="search" size={16} />
                </Button>
              </XStack>
            )}


            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
              <YStack gap="$2">
                {inviteEmails.length > 0 ? (
                  /* Email invite preview */
                  <Card padding="$4">
                    <Text textAlign="center" color="$gray11" size="sm">
                      Ready to invite {inviteEmails.filter(e => e.includes('@')).length} new {inviteType}(s)
                    </Text>
                  </Card>
                ) : searchLoading ? (
                  <Card padding="$4">
                    <Text textAlign="center" color="$gray11">
                      Searching...
                    </Text>
                  </Card>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <Card padding="$4">
                    <Text textAlign="center" color="$gray11">
                      No users found
                    </Text>
                  </Card>
                ) : (
                  searchResults.map((user) => (
                    <Card key={user.id} padding="$3" pressStyle={{ scale: 0.98 }}>
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack flex={1}>
                          <Text fontWeight="bold">{user.full_name || 'Unknown User'}</Text>
                          <Text color="$gray11" fontSize="$3">
                            {user.email}
                          </Text>
                        </YStack>
                        <Button
                          onPress={() => sendInvitation(user.id, inviteType!)}
                          variant="secondary"
                          size="sm"
                          backgroundColor="$blue10"
                        >
                          <Text color="white">Invite</Text>
                        </Button>
                      </XStack>
                    </Card>
                  ))
                )}
              </YStack>
            </ScrollView>

            <Button
              onPress={() => setShowInviteModal(false)}
              variant="secondary"
              backgroundColor="$backgroundHover"
            >
              Cancel
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      {/* Student Selector Modal for Teachers/Instructors */}
      <Modal
        visible={showStudentSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStudentSelector(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowStudentSelector(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
            maxHeight="80%"
          >
            <Text size="xl" weight="bold" color="$color">
              Select Student to View
            </Text>
            <Text color="$gray11" size="sm">
              Choose a student to view their progress, routes, and exercises
            </Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
              <YStack gap="$2">
                {/* Option to view own profile */}
                <Button
                  onPress={() => switchActiveStudent(null)}
                  variant={!activeStudentId ? 'primary' : 'secondary'}
                  backgroundColor={!activeStudentId ? '$blue10' : undefined}
                  size="lg"
                >
                  <YStack alignItems="flex-start" width="100%">
                    <Text color={!activeStudentId ? 'white' : '$color'} fontWeight="bold">
                      My Own Profile
                    </Text>
                    <Text color={!activeStudentId ? 'white' : '$gray11'} fontSize="$3">
                      View your own progress and data
                    </Text>
                  </YStack>
                </Button>

                {/* Students list */}
                {supervisedStudents.length === 0 ? (
                  <YStack padding="$4" alignItems="center">
                    <Text color="$gray11" textAlign="center">
                      No supervised students
                    </Text>
                    <Text color="$gray11" fontSize="$3" textAlign="center" marginTop="$2">
                      Students need to add you as their supervisor first
                    </Text>
                  </YStack>
                ) : (
                  supervisedStudents.map((student) => {
                    const isSelected = activeStudentId === student.id;
                    return (
                      <Button
                        key={student.id}
                        onPress={() => switchActiveStudent(student.id)}
                        variant={isSelected ? 'primary' : 'secondary'}
                        backgroundColor={isSelected ? '$green10' : undefined}
                        size="lg"
                      >
                        <YStack alignItems="flex-start" width="100%">
                          <Text color={isSelected ? 'white' : '$color'} fontWeight="bold">
                            {student.full_name}
                          </Text>
                          {student.email && (
                            <Text color={isSelected ? 'white' : '$gray11'} fontSize="$3">
                              {student.email}
                            </Text>
                          )}
                          {isSelected && (
                            <Text color="white" fontSize="$2" marginTop="$1">
                              Currently Active
                            </Text>
                          )}
                        </YStack>
                      </Button>
                    );
                  })
                )}
              </YStack>
            </ScrollView>

            <Button
              onPress={() => setShowStudentSelector(false)}
              variant="secondary"
              backgroundColor="$backgroundHover"
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      {/* Unified Relationship Management Modal */}
      <RelationshipManagementModal
        visible={showRelationshipModal}
        onClose={() => {
          setShowRelationshipModal(false);
          // Refresh pending invitations when modal closes
          fetchPendingInvitations();
        }}
        userRole={getUserRole()}
        supervisedStudents={supervisedStudents}
        onStudentSelect={handleStudentSelection}
        availableSupervisors={getUserRole() === 'student' ? availableSupervisors : availableStudents}
        selectedSupervisorIds={selectedSupervisorIds}
        onSupervisorSelect={setSelectedSupervisorIds}
        onAddSupervisors={addSupervisors}
        onInviteUsers={handleInviteUsers}
        onRefresh={async () => {
          if (canSuperviseStudents()) {
            await fetchSupervisedStudents();
            await fetchAvailableStudents();
            await fetchPendingInvitations();
          } else {
            await fetchAvailableSupervisors();
            await fetchPendingInvitations(); // Also fetch for students
          }
        }}
      />



      {/* Delete Account Dialog */}
      <Modal
        visible={showDeleteDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <Card padding="$4" backgroundColor="$background" borderRadius="$4">
            <YStack gap="$3">
              <Text fontSize="$6" fontWeight="bold">{t('deleteAccount.title') || 'Delete account'}</Text>
              <Text>
                {t('deleteAccount.description') ||
                  'Deleting your account will anonymize your profile. Your content remains unless you choose to remove it below.'}
              </Text>

              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deletePrivateRoutes') || 'Delete my private routes'}</Text>
                <Switch checked={optDeletePrivate} onCheckedChange={setOptDeletePrivate} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deletePublicRoutes') || 'Delete my public routes'}</Text>
                <Switch checked={optDeletePublic} onCheckedChange={setOptDeletePublic} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteEvents') || 'Delete my events'}</Text>
                <Switch checked={optDeleteEvents} onCheckedChange={setOptDeleteEvents} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteExercises') || 'Delete my user exercises'}</Text>
                <Switch checked={optDeleteExercises} onCheckedChange={setOptDeleteExercises} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteReviews') || 'Delete my reviews'}</Text>
                <Switch checked={optDeleteReviews} onCheckedChange={setOptDeleteReviews} />
              </XStack>

              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.transferToggle') || 'Transfer public content to system account'}</Text>
                <Switch checked={optTransferPublic} onCheckedChange={setOptTransferPublic} />
              </XStack>
              <Text color="$gray11">
                {t('deleteAccount.transferHelp') ||
                  'If off, public content will be deleted if that option is selected.'}
              </Text>

              <XStack gap="$2" mt="$2" jc="flex-end">
                <Button variant="secondary" onPress={() => setShowDeleteDialog(false)}>
                  {t('deleteAccount.cancel') || 'Cancel'}
                </Button>
                <Button variant="primary" onPress={handleConfirmDeleteAccount}>
                  {t('deleteAccount.confirm') || 'Delete my account'}
                </Button>
              </XStack>
            </YStack>
          </Card>
        </View>
      </Modal>

      {/* Removal Review Modal */}
      {removalTargetSupervisor && (
        <RelationshipReviewModal
          visible={showRemovalReviewModal}
          onClose={() => {
            setShowRemovalReviewModal(false);
            setRemovalTargetSupervisor(null);
          }}
          profileUserId={removalTargetSupervisor!.id}
          profileUserRole="instructor"
          profileUserName={removalTargetSupervisor!.name}
          canReview={true}
          reviews={[]}
          onReviewAdded={loadRelationshipReviews}
          title={`Review ${removalTargetSupervisor!.name}`}
          subtitle="Please share your experience before ending this supervisory relationship"
          isRemovalContext={true}
          onRemovalComplete={handleRemovalComplete}
        />
      )}

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationDrawer}
        transparent
        animationType="none"
        onRequestClose={hideLocationSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: locationBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideLocationSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: locationSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {t('profile.location.selectLocation') || 'Select Your Location'}
                </Text>
                
                {/* Detect My Location Button - always allow override */}
                <Button 
                  variant="secondary" 
                  size="lg" 
                  onPress={detectLocation}
                  disabled={locationLoading}
                  marginBottom="$3"
                >
                  {locationLoading ? (
                    `${(t('profile.location.detectingLocation') || 'Detecting Location').replace('...', '')}${'.'.repeat(dotsCount)}`
                  ) : (
                    t('profile.location.detectLocation') || 'Detect My Location'
                  )}
                </Button>
                
                {/* Clear location chip - Only show if location is set */}
                {formData.location && (
                  <TouchableOpacity 
                    onPress={async () => {
                      try {
                        // Immediately clear form data
                        setFormData((prev) => ({
                          ...prev,
                          location: '',
                          location_lat: null,
                          location_lng: null,
                        }));
                        
                        // Immediately clear from database profile (all location fields)
                        if (user) {
                          await updateProfile({
                            location: '',
                            location_lat: null,
                            location_lng: null,
                          });
                        }
                        
                        // Clear from LocationContext
                        await setUserLocation({
                          name: '',
                          latitude: 0,
                          longitude: 0,
                          source: 'profile',
                          timestamp: new Date().toISOString(),
                        });
                        
                        // Clear search results and close sheet
                        setLocationSearchResults([]);
                        hideLocationSheet();
                        
                        showToast({
                          title: t('common.success') || 'Success',
                          message: t('profile.location.locationCleared') || 'Location cleared',
                          type: 'success'
                        });
                      } catch (error) {
                        console.error('Error clearing location:', error);
                        showToast({
                          title: t('common.error') || 'Error',
                          message: 'Failed to clear location',
                          type: 'error'
                        });
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '$backgroundHover',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      alignSelf: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text color="$gray11" size="sm">
                      {t('profile.location.clearLocation') || 'Clear Location'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <FormField
                  placeholder={t('profile.location.searchPlaceholder') || "Search cities... (try 'Stockholm', 'New York', etc.)"}
                  value={formData.location}
                  onChangeText={handleLocationSearch}
                />
                
                <ScrollView style={{ maxHeight: 300 }}>
                  <YStack gap="$1">
                    {locationSearchResults.length === 0 && (
                      <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                        No locations found. Keep typing to search worldwide.
                      </Text>
                    )}
                    
                    {locationSearchResults.map((locationData, index) => {
                      const locationName = [locationData.city, locationData.region, locationData.country]
                        .filter(Boolean)
                        .join(', ');
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleLocationSelect(locationData)}
                          style={[
                            styles.sheetOption,
                            {
                              backgroundColor: formData.location === locationName ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
                              borderWidth: formData.location === locationName ? 1 : 0,
                              borderColor: formData.location === locationName ? '#34D399' : 'transparent',
                            }
                          ]}
                        >
                          <XStack gap={12} padding="$2" alignItems="center">
                            <Feather 
                              name="map-pin" 
                              size={16} 
                              color={formData.location === locationName ? '#34D399' : '#666'} 
                            />
                            <YStack flex={1}>
                              <Text 
                                color={formData.location === locationName ? '#34D399' : '$color'} 
                                size="lg"
                              >
                                {locationName}
                              </Text>
                              <Text size="sm" color="$gray11">
                                {locationData.coords?.latitude.toFixed(4)}, {locationData.coords?.longitude.toFixed(4)}
                              </Text>
                            </YStack>
                            {formData.location === locationName && (
                              <Feather name="check" size={16} color="#34D399" />
                            )}
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                </ScrollView>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="none"
        onRequestClose={hideAvatarSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: avatarBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideAvatarSheet}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: avatarSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  Change Avatar
                </Text>
                
                <YStack gap="$1">
                  <TouchableOpacity
                    onPress={() => {
                      hideAvatarSheet();
                      setTimeout(() => handlePickAvatar(false), 300);
                    }}
                    style={[styles.sheetOption, { backgroundColor: 'transparent' }]}
                  >
                    <XStack gap={12} padding="$2" alignItems="center">
                      <Feather name="image" size={20} color="#00E6C3" />
                      <Text color="$color" size="lg">
                        Choose from Library
                      </Text>
                    </XStack>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      hideAvatarSheet();
                      setTimeout(() => handlePickAvatar(true), 300);
                    }}
                    style={[styles.sheetOption, { backgroundColor: 'transparent' }]}
                  >
                    <XStack gap={12} padding="$2" alignItems="center">
                      <Feather name="camera" size={20} color="#00E6C3" />
                      <Text color="$color" size="lg">
                        Take Photo
                      </Text>
                    </XStack>
                  </TouchableOpacity>

                  {formData.avatar_url && (
                    <TouchableOpacity
                      onPress={() => {
                        hideAvatarSheet();
                        setTimeout(() => handleDeleteAvatar(), 300);
                      }}
                      style={[styles.sheetOption, { backgroundColor: 'transparent' }]}
                    >
                      <XStack gap={12} padding="$2" alignItems="center">
                        <Feather name="trash-2" size={20} color="#EF4444" />
                        <Text color="#EF4444" size="lg">
                          Remove Avatar
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  )}
                </YStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Developer Tools Modal (Combined Testing & Developer Options) */}
      <Modal
        visible={showDeveloperModal}
        transparent
        animationType="none"
        onRequestClose={hideDeveloperSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: developerBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideDeveloperSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: developerSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={50}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$3"
                minHeight="90%"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$2">
                  Developer Tools
                </Text>
                
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                  <YStack gap="$3">
                    
                    {/* Onboarding & Tour Reset Section */}
                    <YStack gap="$2">
                      <Text size="lg" weight="bold" color="$color">Reset Onboarding & Tours</Text>
                      
                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            try {
                              // Reset all onboarding and tour flags
                              const { error } = await supabase
                                .from('profiles')
                                .update({
                                  interactive_onboarding_completed: false,
                                  interactive_onboarding_version: null,
                                  tour_completed: false,
                                  tour_content_hash: null,
                                  license_plan_completed: false,
                                  role_confirmed: false,
                                  onboarding_completed: false
                                })
                                .eq('id', user.id);
                              
                              if (error) throw error;
                              
                              // Also clear AsyncStorage
                              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                              await AsyncStorage.multiRemove([
                                'interactive_onboarding',
                                'vromm_onboarding',
                                'tour_completed'
                              ]);
                              
                              showToast({
                                title: '✅ Reset Complete',
                                message: 'All onboarding and tour flags have been reset. Showing onboarding now.',
                                type: 'success'
                              });
                              
                              // Show the onboarding modal
                              setShowOnboardingModal(true);
                            } catch (error) {
                              console.error('Error resetting flags:', error);
                              showToast({
                                title: '❌ Error',
                                message: 'Failed to reset flags: ' + (error as Error).message,
                                type: 'error'
                              });
                            }
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset All Onboarding & Tours
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(() => {
                            resetTour();
                            showToast({
                              title: 'Success',
                              message: 'Tour has been reset. Restart the app to see tour badges again.',
                              type: 'success'
                            });
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset Tour Only
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(() => startDatabaseTour(), 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Start Database Tour
                      </Button>
                    </YStack>

                    {/* Progress & Data Reset Section */}
                    <YStack gap="$2">
                      <Text size="lg" weight="bold" color="$color">Reset User Progress & Data</Text>
                      
                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            Alert.alert(
                              '⚠️ Reset Learning Progress',
                              'This will delete ALL your exercise completions and learning path progress. This cannot be undone!',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Reset Progress',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('learning_path_exercise_completions')
                                        .delete()
                                        .eq('user_id', user.id);
                                      
                                      if (error) throw error;
                                      Alert.alert('✅ Reset Complete', 'All learning progress has been reset.');
                                    } catch (error) {
                                      Alert.alert('❌ Error', 'Failed to reset progress: ' + (error as Error).message);
                                    }
                                  }
                                }
                              ]
                            );
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset Learning Progress
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            Alert.alert(
                              'Reset All Routes',
                              'This will delete ALL your created, saved, and driven routes. This cannot be undone!',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Reset Routes',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      const promises = [
                                        supabase.from('routes').delete().eq('creator_id', user.id),
                                        supabase.from('saved_routes').delete().eq('user_id', user.id),
                                        supabase.from('driven_routes').delete().eq('user_id', user.id)
                                      ];
                                      
                                      await Promise.all(promises);
                                      Alert.alert('Reset Complete', 'All routes have been reset.');
                                    } catch (error) {
                                      Alert.alert('Error', 'Failed to reset routes: ' + (error as Error).message);
                                    }
                                  }
                                }
                              ]
                            );
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset All Routes
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            Alert.alert(
                              'Reset Comments & Reviews',
                              'This will delete ALL your comments and reviews. This cannot be undone!',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Reset All',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      const promises = [
                                        supabase.from('comments').delete().eq('user_id', user.id),
                                        supabase.from('relationship_reviews').delete().eq('reviewer_id', user.id)
                                      ];
                                      
                                      await Promise.all(promises);
                                      Alert.alert('Reset Complete', 'All comments and reviews have been reset.');
                                    } catch (error) {
                                      Alert.alert('Error', 'Failed to reset comments/reviews: ' + (error as Error).message);
                                    }
                                  }
                                }
                              ]
                            );
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset Comments & Reviews
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            Alert.alert(
                              'Reset Events & Messages',
                              'This will delete ALL your events and messages. This cannot be undone!',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Reset All',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      const promises = [
                                        supabase.from('events').delete().eq('creator_id', user.id),
                                        supabase.from('chat_messages').delete().eq('sender_id', user.id)
                                      ];
                                      
                                      await Promise.all(promises);
                                      Alert.alert('Reset Complete', 'All events and messages have been reset.');
                                    } catch (error) {
                                      Alert.alert('Error', 'Failed to reset events/messages: ' + (error as Error).message);
                                    }
                                  }
                                }
                              ]
                            );
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Reset Events & Messages
                      </Button>
                    </YStack>

                    {/* Developer Mode Settings */}
                    <YStack gap="$2">
                      <Text size="lg" weight="bold" color="$color">Developer Mode Settings</Text>
                      
                      <XStack justifyContent="space-between" alignItems="center" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                        <YStack flex={1}>
                          <Text color="$color" fontWeight="500">Developer Mode</Text>
                          <Text color="$gray11" fontSize="$3">Show developer tools and testing features</Text>
                        </YStack>
                        <Switch
                          size="$4"
                          checked={(profile as any)?.developer_mode || false}
                          backgroundColor={(profile as any)?.developer_mode ? '$blue8' : '$gray6'}
                          onCheckedChange={async (checked) => {
                            try {
                              if (!user?.id) return;
                              const { error } = await supabase
                                .from('profiles')
                                .update({ developer_mode: checked })
                                .eq('id', user.id);
                              
                              if (error) throw error;
                              
                              // Refresh profile to update UI
                              await refreshProfile();
                              
                              Alert.alert(
                                checked ? 'Developer Mode Enabled' : 'Developer Mode Disabled',
                                checked 
                                  ? 'Developer tools are now available in your profile'
                                  : 'Developer tools have been hidden from your profile'
                              );
                            } catch (error) {
                              console.error('Error updating developer mode:', error);
                              Alert.alert('Error', 'Failed to update developer mode');
                            }
                          }}
                        >
                          <Switch.Thumb />
                        </Switch>
                      </XStack>
                    </YStack>

                    {/* Developer Tools Section */}
                    <YStack gap="$2">
                      <Text size="lg" weight="bold" color="$color">Developer Tools</Text>
                      
                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(() => refreshTranslations(), 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Refresh Translations
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            console.log('Testing promotional modal...');
                            checkForPromotionalContent();
                            Alert.alert('Test', 'Promotional modal trigger sent - check console and UI.');
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Test Promotional Modal
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(() => navigateToOnboardingDemo(), 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Content Updates Demo
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(() => navigateToTranslationDemo(), 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Translation Demo
                      </Button>

                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            try {
                              if (Platform.OS === 'web') {
                                // Web debug mode with CSS
                                const style = document.createElement('style');
                                style.id = 'debug-borders';
                                style.innerHTML = `
                                  * { 
                                    border: 1px solid rgba(255, 0, 0, 0.3) !important; 
                                    position: relative !important;
                                  }
                                  *:before {
                                    content: attr(data-testid) attr(class);
                                    position: absolute;
                                    top: -20px;
                                    left: 0;
                                    background: rgba(255, 0, 0, 0.8);
                                    color: white;
                                    font-size: 10px;
                                    padding: 2px 4px;
                                    z-index: 10000;
                                    pointer-events: none;
                                  }
                                `;
                                
                                const existing = document.getElementById('debug-borders');
                                if (existing) {
                                  existing.remove();
                                  Alert.alert('Debug Mode', 'Element borders disabled');
                                } else {
                                  document.head.appendChild(style);
                                  Alert.alert('Debug Mode', 'Element borders enabled - all elements now have red borders');
                                }
                              } else {
                                // React Native debug mode - toggle state
                                setDebugMode(!debugMode);
                                Alert.alert(
                                  'Debug Mode',
                                  debugMode 
                                    ? 'Visual debugging disabled' 
                                    : 'Visual debugging enabled - components now show borders and dimensions',
                                  [
                                    { text: 'OK' },
                                    {
                                      text: 'Show Performance',
                                      onPress: () => {
                                        const summary = getPerformanceSummary();
                                        Alert.alert('Performance Summary', JSON.stringify(summary, null, 2));
                                      }
                                    }
                                  ]
                                );
                              }
                            } catch (error) {
                              Alert.alert('Error', 'Failed to toggle debug mode');
                            }
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                      >
                        Toggle Debug Mode {debugMode ? '(ON)' : '(OFF)'}
                      </Button>
                      
                      <Button
                        onPress={() => {
                          hideDeveloperSheet();
                          setTimeout(async () => {
                            if (!user?.id) return;
                            Alert.alert(
                              'Nuclear Reset',
                              'This will reset EVERYTHING: onboarding, tours, progress, routes, comments, reviews, events, messages. This cannot be undone!',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'RESET EVERYTHING',
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      // Reset all flags
                                      await supabase
                                        .from('profiles')
                                        .update({
                                          interactive_onboarding_completed: false,
                                          interactive_onboarding_version: null,
                                          tour_completed: false,
                                          tour_content_hash: null,
                                          license_plan_completed: false,
                                          role_confirmed: false,
                                          onboarding_completed: false
                                        })
                                        .eq('id', user.id);
                                      
                                      const promises = [
                                        supabase.from('learning_path_exercise_completions').delete().eq('user_id', user.id),
                                        supabase.from('routes').delete().eq('creator_id', user.id),
                                        supabase.from('saved_routes').delete().eq('user_id', user.id),
                                        supabase.from('driven_routes').delete().eq('user_id', user.id),
                                        supabase.from('comments').delete().eq('user_id', user.id),
                                        supabase.from('relationship_reviews').delete().eq('reviewer_id', user.id),
                                        supabase.from('events').delete().eq('creator_id', user.id),
                                        supabase.from('chat_messages').delete().eq('sender_id', user.id)
                                      ];
                                      
                                      await Promise.all(promises);
                                      
                                      // Clear AsyncStorage
                                      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                                      await AsyncStorage.multiRemove([
                                        'interactive_onboarding',
                                        'vromm_onboarding',
                                        'tour_completed'
                                      ]);
                                      
                                      Alert.alert('Nuclear Reset Complete', 'Everything has been reset. Restart the app for a fresh start.');
                                    } catch (error) {
                                      Alert.alert('Error', 'Failed to complete nuclear reset: ' + (error as Error).message);
                                    }
                                  }
                                }
                              ]
                            );
                          }, 300);
                        }}
                        variant="outlined"
                        size="lg"
                        backgroundColor="$red9"
                      >
                        Nuclear Reset (Everything)
                      </Button>
                    </YStack>
                  </YStack>
                </ScrollView>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="none"
        onRequestClose={hideNotificationSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: notificationBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideNotificationSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: notificationSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={50}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$3"
                minHeight="40%"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$2">
                  Notification Settings
                </Text>
                
                <ScrollView style={{ flex: 1 }}>
                  <YStack gap="$4">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text color="$color" fontWeight="500">
                          Push Notifications
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          Get notified about messages, routes, and updates
                        </Text>
                      </YStack>
                      <Switch
                        size="$4"
                        checked={true}
                        backgroundColor="$blue8"
                        onCheckedChange={async (checked) => {
                          if (checked) {
                            await pushNotificationService.registerForPushNotifications();
                            Alert.alert(
                              'Notifications Enabled',
                              'You will receive push notifications for important updates.',
                            );
                          } else {
                            Alert.alert(
                              'Feature Not Available',
                              'Notification disabling will be available in a future update.',
                            );
                          }
                        }}
                      >
                        <Switch.Thumb />
                      </Switch>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text color="$color" fontWeight="500">
                          App Badge
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          Show unread count on app icon
                        </Text>
                      </YStack>
                      <Switch
                        size="$4"
                        checked={true}
                        backgroundColor="$blue8"
                        onCheckedChange={async (checked) => {
                          if (checked) {
                            await pushNotificationService.updateBadgeCount();
                            Alert.alert('Badge Enabled', 'App icon will show unread count.');
                          } else {
                            await pushNotificationService.setBadgeCount(0);
                            Alert.alert('Badge Disabled', 'App icon badge cleared.');
                          }
                        }}
                      >
                        <Switch.Thumb />
                      </Switch>
                    </XStack>

                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text color="$color" fontWeight="500">
                          Notification Sounds
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          Play sounds for messages and notifications
                        </Text>
                      </YStack>
                      <Switch
                        size="$4"
                        checked={soundEnabled}
                        backgroundColor={soundEnabled ? '$blue8' : '$gray6'}
                        onCheckedChange={async (checked) => {
                          try {
                            const AsyncStorage = (
                              await import('@react-native-async-storage/async-storage')
                            ).default;
                            await AsyncStorage.setItem(
                              'notification_sound_enabled',
                              checked.toString(),
                            );
                            setSoundEnabled(checked);

                            if (checked) {
                              Alert.alert('Sounds Enabled', 'You will hear notification sounds.');
                              await pushNotificationService.playNotificationSound('notification');
                            } else {
                              Alert.alert('Sounds Disabled', 'Notification sounds turned off.');
                            }
                          } catch (error) {
                            console.error('Error updating sound settings:', error);
                            Alert.alert('Error', 'Failed to update sound settings');
                          }
                        }}
                      >
                        <Switch.Thumb />
                      </Switch>
                    </XStack>

                    <Button
                      variant="outlined"
                      size="lg"
                      onPress={async () => {
                        try {
                          await pushNotificationService.updateBadgeCount();
                          const currentBadge = await pushNotificationService.getBadgeCount();
                          Alert.alert(
                            'Badge Updated',
                            `Current badge count: ${currentBadge}\n\nNote: Badge count may only be visible when the app is published to the App Store.`,
                          );
                        } catch (error) {
                          console.error('Badge update error:', error);
                          Alert.alert('Error', 'Failed to update badge count');
                        }
                      }}
                    >
                      Update Badge Count
                    </Button>

                    <Button
                      variant="outlined"
                      size="lg"
                      onPress={async () => {
                        try {
                          Alert.alert('Test Sounds', 'Choose a sound to test:', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Notification Sound',
                              onPress: async () => {
                                await pushNotificationService.playNotificationSound('notification');
                              },
                            },
                            {
                              text: 'Message Sound',
                              onPress: async () => {
                                await pushNotificationService.playNotificationSound('message');
                              },
                            },
                            {
                              text: 'System Sound',
                              onPress: async () => {
                                await pushNotificationService.playSystemSound();
                              },
                            },
                          ]);
                        } catch (error) {
                          console.error('Test sound error:', error);
                          Alert.alert('Error', 'Failed to play test sound');
                        }
                      }}
                    >
                      Test Sounds
                    </Button>

                    <Button
                      variant="outlined"
                      size="lg"
                      onPress={async () => {
                        try {
                          await pushNotificationService.clearAllNotifications();
                          await pushNotificationService.setBadgeCount(0);
                          Alert.alert('Cleared', 'All notifications and badge count cleared');
                        } catch (error) {
                          console.error('Clear notifications error:', error);
                          Alert.alert('Error', 'Failed to clear notifications');
                        }
                      }}
                    >
                      Clear All Notifications
                    </Button>
                  </YStack>
                </ScrollView>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Theme Settings Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="none"
        onRequestClose={hideThemeSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: themeBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideThemeSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: themeSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={50}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$3"
                minHeight="70%"
                maxHeight="90%"
              >
                <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$2">
                  Theme Settings
                </Text>
                
                <YStack gap="$4" flex={1}>
                    {/* System Default - First and Default Option */}
                    <XStack 
                      justifyContent="space-between" 
                      alignItems="center"
                      backgroundColor={(!profile?.theme_preference || profile?.theme_preference === 'system') ? '$blue4' : undefined}
                      padding="$3"
                      borderRadius="$3"
                    >
                      <YStack flex={1}>
                        <Text 
                          color="$color" 
                          fontWeight={(!profile?.theme_preference || profile?.theme_preference === 'system') ? '700' : '500'}
                        >
                          {t('profile.theme.system') || 'System Default'}
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          {t('profile.theme.systemDescription') || 'Follow your device\'s theme setting'}
                        </Text>
                      </YStack>
                      <RadioButton
                        selected={!profile?.theme_preference || profile?.theme_preference === 'system'}
                        onPress={async () => {
                          try {
                            console.log('🎨 Theme switching to: system');
                            await updateProfile({ theme_preference: 'system' });
                            console.log('🎨 Theme updated successfully to system');
                            showToast({
                              title: 'Theme Updated',
                              message: 'Theme updated to system default',
                              type: 'success'
                            });
                            hideThemeSheet();
                          } catch (error) {
                            console.error('🎨 Theme update failed:', error);
                            showToast({
  title: 'Error',
  message: 'Failed to update theme',
  type: 'error'
});
                          }
                        }}
                      />
                    </XStack>

                    <XStack 
                      justifyContent="space-between" 
                      alignItems="center"
                      backgroundColor={profile?.theme_preference === 'light' ? '$blue4' : undefined}
                      padding="$3"
                      borderRadius="$3"
                    >
                      <YStack flex={1}>
                        <Text 
                          color="$color" 
                          fontWeight={profile?.theme_preference === 'light' ? '700' : '500'}
                        >
                          {t('profile.theme.light') || 'Light Mode'}
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          {t('profile.theme.lightDescription') || 'Clean, bright interface for daytime use'}
                        </Text>
                      </YStack>
                      <RadioButton
                        selected={profile?.theme_preference === 'light'}
                        onPress={async () => {
                          try {
                            console.log('🎨 Theme switching to: light');
                            console.log('🎨 Before update - profile theme:', profile?.theme_preference);
                            await updateProfile({ theme_preference: 'light' });
                            console.log('🎨 After update - profile theme:', profile?.theme_preference);
                            console.log('🎨 Theme updated successfully to light');
                            console.log('🎨 Current color scheme:', systemColorScheme);
                            showToast({
  title: 'Theme Updated',
  message: 'Theme updated to light mode',
  type: 'success'
});
                            hideThemeSheet();
                          } catch (error) {
                            console.error('🎨 Theme update failed:', error);
                            showToast({
  title: 'Error',
  message: 'Failed to update theme',
  type: 'error'
});
                          }
                        }}
                      />
                    </XStack>

                    <XStack 
                      justifyContent="space-between" 
                      alignItems="center"
                      backgroundColor={profile?.theme_preference === 'dark' ? '$blue4' : undefined}
                      padding="$3"
                      borderRadius="$3"
                    >
                      <YStack flex={1}>
                        <Text 
                          color="$color" 
                          fontWeight={profile?.theme_preference === 'dark' ? '700' : '500'}
                        >
                          {t('profile.theme.dark') || 'Dark Mode'}
                        </Text>
                        <Text color="$gray11" fontSize="$3">
                          {t('profile.theme.darkDescription') || 'Easy on the eyes for low-light environments'}
                        </Text>
                      </YStack>
                      <RadioButton
                        selected={profile?.theme_preference === 'dark'}
                        onPress={async () => {
                          try {
                            console.log('🎨 Theme switching to: dark');
                            await updateProfile({ theme_preference: 'dark' });
                            console.log('🎨 Theme updated successfully to dark');
                            showToast({
  title: 'Theme Updated',
  message: 'Theme updated to dark mode',
  type: 'success'
});
                            hideThemeSheet();
                          } catch (error) {
                            console.error('🎨 Theme update failed:', error);
                            showToast({
  title: 'Error',
  message: 'Failed to update theme',
  type: 'error'
});
                          }
                        }}
                      />
                    </XStack>

                  </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Körkortsplan Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showKorkortsplanModal}
        onRequestClose={hideKorkortsplanSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: korkortsplanBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideKorkortsplanSheet} />
            <Animated.View
              style={{
                backgroundColor: '$background',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                minHeight: '60%',
                transform: [{ translateY: korkortsplanSheetTranslateY }],
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <YStack gap="$4">
                  {/* Header - matching OnboardingInteractive style (centered, no X) */}
                  <Text size="xl" weight="bold" color="$color" textAlign="center">
                    {t('onboarding.licensePlan.title') || 'Your License Journey'}
                  </Text>

                  <Text color="$gray11" textAlign="center">
                    {t('onboarding.licensePlan.description') || 'Tell us about your experience level, driving goals and vehicle preferences'}
                  </Text>

                  <YStack gap="$4" marginTop="$4">
                    {/* Target License Date with Quick Options */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.date.title') || 'When do you want your license?'}</Text>
                      
                      {/* Quick Date Options */}
                      {[
                        { label: t('onboarding.date.within3months') || 'Within 3 months', months: 3, key: '3months' },
                        { label: t('onboarding.date.within6months') || 'Within 6 months', months: 6, key: '6months' },
                        { label: t('onboarding.date.within1year') || 'Within 1 year', months: 12, key: '1year' },
                        { label: t('onboarding.date.noSpecific') || 'No specific date', months: 24, key: 'nodate' },
                      ].map((option) => {
                        const optionTargetDate = new Date();
                        optionTargetDate.setMonth(optionTargetDate.getMonth() + option.months);
                        const isSelected = selectedDateOption === option.key;
                        
                        return (
                          <RadioButton
                            key={option.label}
                            onPress={() => {
                              setTargetDate(optionTargetDate);
                              setSelectedDateOption(option.key);
                            }}
                            title={option.label}
                            description={optionTargetDate.toLocaleDateString()}
                            isSelected={isSelected}
                          />
                        );
                      })}
                      
                      {/* Custom Date Picker with Popover - using RadioButton component */}
                      <View ref={dateButtonRef}>
                        <RadioButton
                          onPress={() => {
                            console.log('🗓️ [ProfileScreen] Opening date popover');
                            setSelectedDateOption('custom');
                            setShowDatePopover(true);
                          }}
                          title={t('onboarding.date.pickSpecific') || 'Pick specific date'}
                          description={targetDate ? targetDate.toLocaleDateString() : new Date().toLocaleDateString()}
                          isSelected={selectedDateOption === 'custom'}
                        />
                      </View>
                      
                      <Popover
                        isVisible={showDatePopover}
                        onRequestClose={() => {
                          console.log('🗓️ [ProfileScreen] Popover onRequestClose called');
                          setShowDatePopover(false);
                          // Complete cleanup to prevent any blocking issues
                          setTimeout(() => {
                            console.log('🗓️ [ProfileScreen] Complete cleanup after popover close');
                            setSelectedDateOption('custom');
                          }, 10);
                        }}
                        from={dateButtonRef}
                        placement={'top' as any}
                        backgroundStyle={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                        popoverStyle={{
                          backgroundColor: '$background',
                          borderRadius: 12,
                          padding: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 12,
                          width: 380,
                          height: 480,
                          borderWidth: 1,
                          borderColor: '$borderColor',
                        }}
                      >
                        <YStack alignItems="center" gap="$2" width="100%">
                          <Text color="$color" size="lg" weight="semibold" textAlign="center">
                            {t('onboarding.date.selectTarget') || 'Select Target Date'}
                          </Text>
                          
                          {/* Container for full inline DateTimePicker */}
                          <View style={{
                            width: 350,
                            height: 380,
                            backgroundColor: '$background',
                            borderRadius: 8,
                            overflow: 'visible',
                          }}>
                            <DateTimePicker
                              testID="dateTimePicker"
                              value={targetDate || new Date()}
                              mode="date"
                              display="inline"
                              minimumDate={new Date()}
                              maximumDate={(() => {
                                const maxDate = new Date();
                                maxDate.setFullYear(maxDate.getFullYear() + 3);
                                return maxDate;
                              })()}
                              onChange={(event, selectedDate) => {
                                console.log('🗓️ [ProfileScreen] Date changed:', selectedDate?.toLocaleDateString());
                                if (selectedDate) {
                                  setTargetDate(selectedDate);
                                  setSelectedDateOption('custom');
                                  // Don't auto-close - let user press save button
                                  console.log('🗓️ [ProfileScreen] Date updated, waiting for save button');
                                }
                              }}
                              style={{ 
                                width: 350, 
                                height: 380,
                                backgroundColor: '$background',
                              }}
                              themeVariant="dark"
                              accentColor="#00E6C3"
                              locale={language === 'sv' ? 'sv-SE' : 'en-US'}
                            />
                          </View>
                          
                        </YStack>
                      </Popover>
                    </YStack>

                    {/* Theory Test Toggle */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('onboarding.licensePlan.hasTheory') || 'Have you passed the theory test?'}
                      </Text>
                      <XStack alignItems="center" gap="$2">
                        <Switch 
                          size="$4"
                          checked={hasTheory} 
                          onCheckedChange={setHasTheory}
                          backgroundColor={hasTheory ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                        <Text size="md" color="$color">
                          {hasTheory ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Practice Test Toggle */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('onboarding.licensePlan.hasPractice') || 'Have you passed the practical test?'}
                      </Text>
                      <XStack alignItems="center" gap="$2">
                        <Switch 
                          size="$4"
                          checked={hasPractice} 
                          onCheckedChange={setHasPractice}
                          backgroundColor={hasPractice ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                        <Text size="md" color="$color">
                          {hasPractice ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Previous Experience */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.licensePlan.previousExperience') || 'Previous driving experience'}</Text>
                      <TextArea
                        placeholder={t('onboarding.licensePlan.experiencePlaceholder') || 'Describe your previous driving experience'}
                        value={previousExperience}
                        onChangeText={setPreviousExperience}
                        minHeight={100}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        focusStyle={{
                          borderColor: '$blue8',
                        }}
                      />
                    </YStack>

                    {/* Specific Goals */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.licensePlan.specificGoals') || 'Specific goals'}</Text>
                      <TextArea
                        placeholder={t('onboarding.licensePlan.goalsPlaceholder') || 'Do you have specific goals with your license?'}
                        value={specificGoals}
                        onChangeText={setSpecificGoals}
                        minHeight={100}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        focusStyle={{
                          borderColor: '$blue8',
                        }}
                      />
                    </YStack>
                  </YStack>

                  <Button variant="primary" size="lg" onPress={handleLicensePlanSubmit} marginTop="$4" disabled={loading}>
                    {loading ? (t('common.saving') || 'Saving...') : (t('onboarding.licensePlan.savePreferences') || 'Save My Preferences')}
                  </Button>
                </YStack>
              </ScrollView>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>
      
      {/* Lock Modal */}
      <LockModal
        visible={showLockModal}
        onClose={hideLockModal}
        contentType={modalContentType}
        featureName={featureName}
      />
      
      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <OnboardingModalInteractive
          visible={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
          }}
        />
      )}
    </Screen>
  );
}
