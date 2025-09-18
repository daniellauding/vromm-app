import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { SectionHeader } from './SectionHeader';
import { ExerciseListSheet } from './ExerciseListSheet';
import Svg, { Circle } from 'react-native-svg';
import { useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTourTarget } from './TourOverlay';
import { useTour } from '../contexts/TourContext';
import { useStripe } from '@stripe/stripe-react-native';
import { useToast } from '../contexts/ToastContext';
import { useUnlock } from '../contexts/UnlockContext';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Modal as RNModal, Pressable, TextInput, Alert, Dimensions, useColorScheme } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon: string | null;
  image: string | null;
  order_index: number;
  active: boolean;
  platform?: string;
  type?: string;
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
  created_at: string;
  updated_at: string;
  // Access Control & Paywall
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  learning_path_exercises: {
    id: string;
    learning_path_id: string;
    order_index: number;
    created_at: string;
    updated_at: string;
  }[];
}

interface ProgressCircleProps {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}

// ProgressCircle component
function ProgressCircle({
  percent,
  size = 40,
  color = '#00E6C3',
  bg = '#222',
}: ProgressCircleProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));
  return (
    <Svg width={size} height={size}>
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
}

// Category types matching ProgressScreen
type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile'
  | 'platform'
  | 'type';

interface ProgressSectionProps {
  activeUserId?: string | null;
}

const loadLastAudit = async (
  effectiveUserId: string | null,
): Promise<{ action: string; actor_name: string | null; created_at: string } | null> => {
  if (!effectiveUserId) return null;
  try {
    const { data, error } = await supabase
      .from('exercise_completion_audit')
      .select('action, actor_name, created_at')
      .eq('student_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
};

const fetchCompletions = async (effectiveUserId: string | null): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_path_exercise_completions')
      .select('exercise_id')
      .eq('user_id', effectiveUserId);

    if (!error && data) {
      return data.map((c: { exercise_id: string }) => c.exercise_id);
    } else {
      console.log('📊 [ProgressSection] No completions or error for user:', effectiveUserId, error);
      return [];
    }
  } catch (err) {
    console.error('Error fetching completions:', err);
    return [];
  }
};

const fetchLearningPaths = async (): Promise<LearningPath[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_paths')
      .select('* , learning_path_exercises(*)')
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (error) return [];
    return data || [];
  } catch (err) {
    console.error('Error fetching learning paths:', err);
    return [];
  }
};

export function ProgressSection({ activeUserId }: ProgressSectionProps) {
  const { language: lang, t } = useTranslation();
  const { user: authUser, profile } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { showToast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    unlockedPaths,
    userPayments,
    addUnlockedPath,
    loadUserPayments,
    loadUnlockedContent,
    isPathUnlocked,
    hasPathPayment,
  } = useUnlock();
  const colorScheme = useColorScheme();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [lastAudit, setLastAudit] = useState<{
    action: string;
    actor_name: string | null;
    created_at: string;
  } | null>(null);

  // Modal state (local to component)
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<LearningPath | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<LearningPath | null>(null);
  const [pathPasswordInput, setPathPasswordInput] = useState('');

  // Exercise List Sheet state
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedPathTitle, setSelectedPathTitle] = useState<string>('');
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);

  // Load the display name/email for the user whose progress is being viewed (matching ProgressScreen.tsx)
  useEffect(() => {
    const loadViewingUser = async () => {
      try {
        if (!effectiveUserId) {
          setViewingUserName(null);
          return;
        }
        
        // Only show viewing indicator if we're viewing someone else's progress
        if (effectiveUserId === authUser?.id) {
          setViewingUserName(null);
          return;
        }
        
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', effectiveUserId)
          .single();
        setViewingUserName(data?.full_name || data?.email || null);
        console.log('👥 [ProgressSection] Viewing student:', data?.full_name || data?.email);
      } catch {
        setViewingUserName(null);
      }
    };
    loadViewingUser();
  }, [effectiveUserId, authUser?.id]);

  // Register first progress card for tour targeting
  const firstProgressCardRef = useTourTarget('ProgressSection.FirstCard');
  const { isActive: tourActive, currentStep, steps } = useTour();
  
  // Helper function to check if ProgressSection should be highlighted
  const isProgressSectionHighlighted = (): boolean => {
    if (!tourActive || typeof currentStep !== 'number' || !steps[currentStep]) return false;
    const step = steps[currentStep];
    return step.targetElement === 'ProgressSection.FirstCard';
  };
  
  // Debug tour registration  
  useEffect(() => {
    if (firstProgressCardRef?.current) {
      console.log('🎯 [ProgressSection] First card ref registered successfully');
    }
  }, [firstProgressCardRef]);

  // Add filter state (same as ProgressScreen)
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: 'all',
    transmission_type: 'all',
    license_type: 'all',
    experience_level: 'all',
    purpose: 'all',
    user_profile: 'all',
    platform: 'all',
    type: 'all',
  });

  // Use activeUserId from navigation if provided, otherwise check StudentSwitchContext, then fall back to authUser
  // This matches the exact logic from ProgressScreen.tsx for instructor support
  const effectiveUserId: string | null = activeUserId || activeStudentId || authUser?.id || null;
  
  // Load shared unlock data when user changes
  useEffect(() => {
    if (effectiveUserId) {
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
      console.log('🔓 [ProgressSection] Loading shared unlock data for user:', effectiveUserId);
    }
  }, [effectiveUserId, loadUserPayments, loadUnlockedContent]);
  
  // Debug logging for user switching (matching ProgressScreen.tsx)
  console.log('🔍 [ProgressSection] User ID Debug:', {
    activeUserId: activeUserId,
    authUserId: authUser?.id,
    activeStudentId: activeStudentId,
    effectiveUserId: effectiveUserId,
    isViewingStudent: activeUserId && activeUserId !== authUser?.id,
    isViewingStudentFromContext: !!activeStudentId,
    authUserName: authUser?.email,
    profileRole: profile?.role
  });

  // Access control helper functions (uses shared context)
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  const checkPathPaywall = async (path: LearningPath): Promise<boolean> => {
    if (!path.paywall_enabled) return true;
    if (hasPathPayment(path.id)) return true;
    setPaywallPath(path);
    setShowPaywallModal(true);
    return false;
  };

  const checkPathPassword = async (path: LearningPath): Promise<boolean> => {
    if (!path.is_locked) return true;
    if (isPathUnlocked(path.id)) return true;
    setPasswordPath(path);
    setShowPasswordModal(true);
    return false;
  };

  // Helper function to get user profile preferences (same as ProgressScreen)
  const getProfilePreference = (key: string, defaultValue: string): string => {
    if (!profile) return defaultValue;
    
    try {
      // Check if profile has license_plan_data from onboarding
      const licenseData = (profile as any)?.license_plan_data;
      if (licenseData && typeof licenseData === 'object') {
        const value = licenseData[key];
        console.log(`🔍 [ProgressSection] Reading profile preference ${key}:`, value);
        return value || defaultValue;
      }
      
      // Fallback to direct profile properties
      const value = (profile as any)[key];
      return value || defaultValue;
    } catch (error) {
      console.log('Error getting profile preference:', error);
      return defaultValue;
    }
  };

  // Load filter preferences from AsyncStorage - USER-SPECIFIC (same as ProgressScreen)
  const loadFilterPreferences = async (): Promise<Record<CategoryType, string> | null> => {
    try {
      // Make filter loading user-specific for supervisors viewing different students
      const filterKey = `vromm_progress_filters_${effectiveUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(filterKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ [ProgressSection] Loaded saved filter preferences for user:', effectiveUserId, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    }
    return null;
  };


  // Load filters and learning paths
  useEffect(() => {
    console.log('ProgressSection: Fetching learning paths and filters');
    setLoading(true);
    const fetch = async () => {
      // Load filters first
      try {
        const savedFilters = await loadFilterPreferences();
        
        if (savedFilters) {
          // Use saved preferences
          setCategoryFilters(savedFilters);
          console.log('✅ [ProgressSection] Using saved filter preferences:', savedFilters);
        } else {
          // Load defaults from database (same logic as ProgressScreen)
          const { data: categoryData } = await supabase
            .from('learning_path_categories')
            .select('category, value, label, is_default, created_at, order_index')
            .order('order_index', { ascending: true });

          if (categoryData) {
            // Get most recent is_default=true values
            const defaultVehicle = categoryData
              .filter(item => item.category === 'vehicle_type' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultTransmission = categoryData
              .filter(item => item.category === 'transmission_type' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultLicense = categoryData
              .filter(item => item.category === 'license_type' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultExperience = categoryData
              .filter(item => item.category === 'experience_level' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultPurpose = categoryData
              .filter(item => item.category === 'purpose' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultUserProfile = categoryData
              .filter(item => item.category === 'user_profile' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultPlatform = categoryData
              .filter(item => item.category === 'platform' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const defaultType = categoryData
              .filter(item => item.category === 'type' && item.is_default)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            // For instructors, use 'all' filters to show everything
            const isInstructor = profile?.role === 'instructor' || profile?.role === 'school';
            
            const defaultFilters: Record<CategoryType, string> = isInstructor ? {
              vehicle_type: 'all',
              transmission_type: 'all',
              license_type: 'all',
              experience_level: 'all',
              purpose: 'all',
              user_profile: 'all',
              platform: 'all',
              type: 'all',
            } : {
              vehicle_type: getProfilePreference('vehicle_type', defaultVehicle?.value || 'all'),
              transmission_type: getProfilePreference('transmission_type', defaultTransmission?.value || 'all'),
              license_type: getProfilePreference('license_type', defaultLicense?.value || 'all'),
              experience_level: getProfilePreference('experience_level', defaultExperience?.value || 'all'),
              purpose: getProfilePreference('purpose', defaultPurpose?.value || 'all'),
              user_profile: getProfilePreference('user_profile', defaultUserProfile?.value || 'all'),
              platform: defaultPlatform?.value || 'all',
              type: defaultType?.value || 'all',
            };

            setCategoryFilters(defaultFilters);
            console.log('✅ [ProgressSection] Set default category filters:', defaultFilters);
          }
        }
      } catch (error) {
        console.error('Error loading filters for ProgressSection:', error);
      }

      // Load learning paths
      const data = await fetchLearningPaths();
      if (data && data.length > 0) {
        setPaths(data);
        setActivePath(data[0].id);
      }
      setLoading(false);
    };
    fetch();
  }, [profile]); // Reload when profile changes

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ProgressSection: Screen focused, refreshing data');
      if (effectiveUserId) {
        fetchCompletions(effectiveUserId);
      }
    }, [effectiveUserId]),
  );

  useEffect(() => {
    const fetch = async () => {
      const [lastAudit, completions] = await Promise.all([
        loadLastAudit(effectiveUserId),
        fetchCompletions(effectiveUserId),
      ]);

      setLastAudit(lastAudit);
      setCompletedIds(completions);
    };
    fetch();

    // Set up real-time subscription with a debounce mechanism
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Create a unique channel name that includes the component instance
    const channelName = `exercise-completions-home-${Date.now()}`;
    console.log(`ProgressSection: Creating channel ${channelName}`);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          // Log payload for debugging
          console.log('ProgressSection: Realtime update received:', payload.eventType);

          // Debounce to handle batch updates (like Mark All)
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('ProgressSection: Executing debounced fetch');
            fetchCompletions(effectiveUserId);
          }, 200); // Short delay to batch multiple rapid changes
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_repeat_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('ProgressSection: Executing debounced fetch (virtual repeats)');
            fetchCompletions(effectiveUserId);
          }, 200);
        },
      );

    // Clean up subscription and timer on unmount
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  }, [effectiveUserId]);

  const handlePathPress = React.useCallback(
    async (path: LearningPath) => {
      setActivePath(path.id);
      
      // Check paywall first
      const canAccessPaywall = await checkPathPaywall(path);
      if (!canAccessPaywall) {
        return; // Paywall modal will be shown
      }

      // Check password lock
      const canAccessPassword = await checkPathPassword(path);
      if (!canAccessPassword) {
        return; // Password modal will be shown
      }

      // Navigate to ProgressTab with the specific path details and showDetail flag
      // Pass activeUserId so ProgressScreen knows which user's data to show
      console.log(
        '📊 [ProgressSection] Navigating to ProgressTab with effectiveUserId:',
        effectiveUserId,
      );
      navigation.navigate('ProgressTab', {
        selectedPathId: path.id,
        showDetail: true,
        activeUserId: effectiveUserId || undefined, // Pass the active user ID (includes StudentSwitch context)
      });
    },
    [effectiveUserId, navigation, checkPathPaywall, checkPathPassword],
  );

  // Handle opening ExerciseListSheet for quick exercise access
  const handleExerciseSheetPress = React.useCallback(
    async (path: LearningPath) => {
      console.log('🎯 [ProgressSection] Opening ExerciseListSheet for path:', path.title[lang] || path.title.en);
      
      // Check paywall first
      const canAccessPaywall = await checkPathPaywall(path);
      if (!canAccessPaywall) {
        return; // Paywall modal will be shown
      }

      // Check password lock
      const canAccessPassword = await checkPathPassword(path);
      if (!canAccessPassword) {
        return; // Password modal will be shown
      }
      
      setSelectedPathId(path.id);
      setSelectedPathTitle(path.title[lang] || path.title.en);
      setShowExerciseSheet(true);
      console.log('🎯 [ProgressSection] ExerciseListSheet state updated:', {
        selectedPathId: path.id,
        selectedPathTitle: path.title[lang] || path.title.en,
        showExerciseSheet: true
      });
    },
    [lang, checkPathPaywall, checkPathPassword],
  );

  // Filter paths based on user preferences (same logic as ProgressScreen)
  const filteredPaths = React.useMemo(() => {
    return paths.filter((path) => {
      // Handle variations in data values and allow null values
      const matchesVehicleType =
        categoryFilters.vehicle_type === 'all' ||
        !path.vehicle_type ||
        path.vehicle_type === categoryFilters.vehicle_type;
        
      const matchesTransmission =
        categoryFilters.transmission_type === 'all' ||
        !path.transmission_type ||
        path.transmission_type === categoryFilters.transmission_type;
        
      const matchesLicense =
        categoryFilters.license_type === 'all' ||
        !path.license_type ||
        path.license_type === categoryFilters.license_type;
        
      const matchesExperience =
        categoryFilters.experience_level === 'all' ||
        !path.experience_level ||
        path.experience_level === categoryFilters.experience_level;
        
      const matchesPurpose =
        categoryFilters.purpose === 'all' ||
        !path.purpose ||
        path.purpose === categoryFilters.purpose;
        
      const matchesUserProfile =
        categoryFilters.user_profile === 'all' ||
        !path.user_profile ||
        path.user_profile === categoryFilters.user_profile ||
        path.user_profile === 'All'; // "All" user profile matches any filter
        
      const matchesPlatform =
        categoryFilters.platform === 'all' ||
        !path.platform ||
        path.platform === 'both' || // "both" platform matches any filter
        path.platform === categoryFilters.platform ||
        path.platform === 'mobile'; // Always show mobile content
        
      const matchesType =
        categoryFilters.type === 'all' || 
        !path.type || 
        path.type === categoryFilters.type;

      return (
        matchesVehicleType &&
        matchesTransmission &&
        matchesLicense &&
        matchesExperience &&
        matchesPurpose &&
        matchesUserProfile &&
        matchesPlatform &&
        matchesType
      );
    });
  }, [paths, categoryFilters]);

  // Calculate progress for each path
  const getPathProgress = (path: LearningPath) => {
    const ids = path.learning_path_exercises.map((exercise) => exercise.id);
    if (ids.length === 0) return 0;
    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Debug logging for ProgressSection visibility
  console.log('🔍 [ProgressSection] Render check:', {
    loading,
    pathsCount: paths.length,
    filteredPathsCount: filteredPaths.length,
    effectiveUserId,
    profileRole: profile?.role
  });

  if (loading) {
    console.log('🔍 [ProgressSection] Still loading, not rendering');
    return null;
  }

  if (filteredPaths.length === 0) {
    console.log('🔍 [ProgressSection] No filtered paths found, not rendering');
    return null;
  }

  return (
    <YStack 
      space="$4"
      style={[
        // ✅ Tour highlighting for entire ProgressSection when active
        isProgressSectionHighlighted() && {
          borderWidth: 3,
          borderColor: '#00E6C3',
          borderRadius: 16,
          padding: 8,
          backgroundColor: 'rgba(0, 230, 195, 0.1)',
          shadowColor: '#00E6C3',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      <SectionHeader
        title={viewingUserName ? `${viewingUserName}'s Progress` : t('home.yourProgress') || 'Your Progress'}
        variant="chevron"
        onAction={() =>
          navigation.navigate('ProgressTab', {
            activeUserId: effectiveUserId || undefined,
          })
        }
        actionLabel={t('common.seeAll') || 'See All'}
      />
      
      {/* Viewing indicator (matching ProgressScreen.tsx) */}
      {viewingUserName && (
        <YStack paddingHorizontal="$4" marginBottom={4}>
          <YStack padding={10} backgroundColor="#162023" borderRadius={12}>
            <Text color="#00E6C3" fontSize={12}>Viewing as: {viewingUserName}</Text>
          </YStack>
        </YStack>
      )}
      {lastAudit && (
        <YStack paddingHorizontal="$4" marginBottom={4}>
          <Text color="$gray11" fontSize={12}>
            Last: {lastAudit.action.replace('_', ' ')} by {lastAudit.actor_name || 'Unknown'} at{' '}
            {new Date(lastAudit.created_at).toLocaleString()}
          </Text>
        </YStack>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$3" paddingHorizontal="$4">
          {filteredPaths.map((path, index) => {
            const isActive = activePath === path.id;
            const percent = getPathProgress(path);
            // Check access controls
            const isPasswordLocked = isPathPasswordLocked(path);
            const isPaywallLocked = isPathPaywallLocked(path);
            const isEnabled = true; // Allow all paths to be clickable - access control happens in press handler
            // Visual highlight for paths with progress or locked status
            const isNextToUnlock = percent > 0 && percent < 1;
            const isFirstCard = index === 0;
            return (
              <TouchableOpacity
                key={path.id}
                ref={isFirstCard ? firstProgressCardRef : undefined}
                onPress={() => isEnabled && handleExerciseSheetPress(path)}
                activeOpacity={isEnabled ? 0.8 : 1}
                style={{
                  opacity: isEnabled ? 1 : 0.5,
                  borderWidth: (isNextToUnlock || isPasswordLocked || isPaywallLocked) ? 3 : 0,
                  borderColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : isNextToUnlock ? '#00E6C3' : 'transparent',
                  borderRadius: 24,
                  shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : isNextToUnlock ? '#00E6C3' : 'transparent',
                  shadowOpacity: (isNextToUnlock || isPasswordLocked || isPaywallLocked) ? 0.5 : 0,
                  shadowRadius: (isNextToUnlock || isPasswordLocked || isPaywallLocked) ? 12 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  marginBottom: 8,
                }}
                disabled={!isEnabled}
              >
                <YStack
                  backgroundColor={isActive ? '$blue5' : '$backgroundStrong'}
                  padding={12}
                  borderRadius={20}
                  width={100}
                  height={120}
                  justifyContent="space-between"
                  alignItems="center"
                  position="relative"
                >
                  {/* Lock/Payment indicator badges (top-right corner) */}
                  {(isPasswordLocked || isPaywallLocked) && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                      }}
                    >
                      {isPasswordLocked && (
                        <View
                          style={{
                            backgroundColor: '#FF9500',
                            borderRadius: 8,
                            padding: 4,
                            minWidth: 20,
                            alignItems: 'center',
                            marginBottom: isPaywallLocked ? 4 : 0,
                          }}
                        >
                          <MaterialIcons name="lock" size={12} color="white" />
                        </View>
                      )}
                      {isPaywallLocked && (
                        <View
                          style={{
                            backgroundColor: '#00E6C3',
                            borderRadius: 8,
                            padding: 4,
                            minWidth: 20,
                            alignItems: 'center',
                          }}
                        >
                          <Feather name="credit-card" size={10} color="black" />
                        </View>
                      )}
                    </View>
                  )}

                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isPasswordLocked 
                        ? '#FF9500' 
                        : isPaywallLocked 
                          ? '#00E6C3' 
                          : isActive 
                            ? '#00E6C3' 
                            : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {isPasswordLocked ? (
                      <MaterialIcons name="lock" size={24} color="white" />
                    ) : isPaywallLocked ? (
                      <Feather name="credit-card" size={20} color="black" />
                    ) : (
                      <>
                    <ProgressCircle
                      percent={percent}
                      size={40}
                      color={isActive ? '#fff' : '#00E6C3'}
                      bg={isActive ? '#00E6C3' : '#E5E5E5'}
                    />
                    <Text
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 40,
                        height: 40,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        lineHeight: 40,
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                      color={isActive ? '$color' : '$gray11'}
                    >
                      {Math.round(percent * 100)}%
                    </Text>
                      </>
                    )}
                  </View>
                  
                  <YStack alignItems="center" gap={2}>
                  <Text
                    fontSize={14}
                    fontWeight={isActive ? 'bold' : '600'}
                      color={isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : isActive ? '$color' : '$gray11'}
                    numberOfLines={2}
                    textAlign="center"
                  >
                    {path.title[lang]}
                  </Text>
                    
                    {/* Status indicator text */}
                    {isPasswordLocked && (
                      <Text fontSize={10} color="#FF9500" fontWeight="bold">
                        LOCKED
                      </Text>
                    )}
                    {isPaywallLocked && !isPasswordLocked && (
                      <Text fontSize={10} color="#00E6C3" fontWeight="bold">
                        ${path.price_usd || 1.00}
                      </Text>
                    )}
                  </YStack>
                </YStack>
              </TouchableOpacity>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Exercise List Sheet for quick access */}
      <ExerciseListSheet
        visible={showExerciseSheet}
        onClose={() => setShowExerciseSheet(false)}
        title={selectedPathTitle ? `${t('exercises.learningExercises') || 'Learning Exercises'}: ${selectedPathTitle}` : t('exercises.learningExercises') || 'Learning Exercises'}
        learningPathId={selectedPathId || undefined}
        showAllPaths={false}
      />

      {/* 🔒 Paywall Modal for Learning Paths (EXACT COPY from ProgressScreen.tsx) */}
      <RNModal
        visible={showPaywallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaywallModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowPaywallModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: Dimensions.get('window').width - 60,
              maxHeight: Dimensions.get('window').height * 0.8,
            }}
          >
            <ScrollView 
              style={{ maxHeight: Dimensions.get('window').height * 0.8 }}
              showsVerticalScrollIndicator={false}
            >
              <YStack
                backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                borderRadius={24}
                padding={20}
                gap={16}
                borderWidth={1}
                borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                shadowColor="#000"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.3}
                shadowRadius={16}
              >
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={8} flex={1}>
                    <Feather name="lock" size={24} color="#FF9500" />
                    <Text fontSize={20} fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'} flex={1}>
                      {t('progressScreen.paywall.title') || 'Premium Learning Path'}
                    </Text>
                  </XStack>
                  <TouchableOpacity onPress={() => setShowPaywallModal(false)}>
                    <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                  </TouchableOpacity>
                </XStack>

                {paywallPath && (
                  <>
                    {/* Path Info */}
                    <YStack gap={12}>
                      <Text fontSize={24} fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                        {paywallPath.title[lang] || paywallPath.title.en}
                      </Text>
                      <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                        {paywallPath.description[lang] || paywallPath.description.en}
                      </Text>
                    </YStack>

                    {/* Preview */}
                    <View
                      style={{
                        width: '100%',
                        height: 200,
                        borderRadius: 12,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="book-open" size={64} color="#00E6C3" />
                      <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'} marginTop={8}>
                        {t('progressScreen.paywall.preview') || 'Premium Learning Content'}
                      </Text>
                    </View>

                    {/* Features */}
                    <YStack gap={8} padding={16} backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F8F8'} borderRadius={12}>
                      <Text fontSize={16} fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                        {t('progressScreen.paywall.includes') || 'This Premium Path Includes:'}
                      </Text>
                      {[
                        t('progressScreen.paywall.feature1') || '🎯 Advanced driving exercises',
                        t('progressScreen.paywall.feature2') || '📚 Detailed learning content',
                        t('progressScreen.paywall.feature3') || '🎬 Exclusive video tutorials',
                        t('progressScreen.paywall.feature4') || '✅ Progress tracking',
                      ].map((feature, index) => (
                        <Text key={index} fontSize={14} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                          {feature}
                        </Text>
                      ))}
                    </YStack>

                    {/* Pricing */}
                    <YStack gap={8} padding={16} backgroundColor="rgba(0, 230, 195, 0.1)" borderRadius={12}>
                      <XStack alignItems="center" justifyContent="center" gap={8}>
                        <Text fontSize={28} fontWeight="bold" color="#00E6C3">
                          ${paywallPath.price_usd || 1.00}
                        </Text>
                        <Text fontSize={14} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                          {t('progressScreen.paywall.oneTime') || 'one-time unlock'}
                        </Text>
                      </XStack>
                      <Text fontSize={12} color={colorScheme === 'dark' ? '#CCC' : '#666'} textAlign="center">
                        {t('progressScreen.paywall.lifetime') || 'Lifetime access to this learning path'}
                      </Text>
                    </YStack>

                    {/* Action Buttons */}
                    <XStack gap={12} justifyContent="center">
                      <TouchableOpacity
                        onPress={() => setShowPaywallModal(false)}
                        style={{
                          backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                          padding: 16,
                          borderRadius: 12,
                          flex: 1,
                          alignItems: 'center',
                        }}
                      >
                        <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                          {t('common.cancel') || 'Maybe Later'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          console.log('💳 [ProgressSection] ==================== STRIPE PAYMENT FLOW ====================');
                          console.log('💳 [ProgressSection] Payment button pressed for path:', paywallPath.title.en);
                          console.log('💳 [ProgressSection] Payment amount:', paywallPath.price_usd || 1.00);
                          console.log('💳 [ProgressSection] User ID:', effectiveUserId);
                          console.log('💳 [ProgressSection] ================================================================');
                          
                          try {
                            // Show processing toast
                            showToast({
                              title: t('stripe.processing') || 'Processing Payment',
                              message: `Stripe Payment: $${paywallPath.price_usd || 1.00} USD`,
                              type: 'info'
                            });

                            // Create real payment intent using fixed Edge Function
                            const createPaymentIntent = async () => {
                              const amount = paywallPath.price_usd || 1.00;
                              
                              console.log('💳 [ProgressSection] Calling fixed Edge Function...');
                              
                              // Get auth token for the request
                              const { data: { session } } = await supabase.auth.getSession();
                              if (!session?.access_token) {
                                throw new Error('No authentication token available');
                              }
                              
                              // Call the real payment function
                              const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                                body: {
                                  amount: amount,
                                  currency: 'USD',
                                  metadata: {
                                    feature_key: `learning_path_${paywallPath.id}`,
                                    path_id: paywallPath.id,
                                    path_title: paywallPath.title[lang] || paywallPath.title.en,
                                    user_id: effectiveUserId
                                  }
                                },
                                headers: {
                                  Authorization: `Bearer ${session.access_token}`,
                                }
                              });
                              
                              if (error) {
                                console.error('💳 [ProgressSection] Edge function error:', error);
                                
                                // Extract the real error message from the Edge Function response
                                let realErrorMessage = 'Failed to create payment intent';
                                
                                if (error instanceof FunctionsHttpError) {
                                  try {
                                    const errorDetails = await error.context.json();
                                    console.error('💳 [ProgressSection] Edge function error details:', errorDetails);
                                    realErrorMessage = errorDetails.error || errorDetails.message || realErrorMessage;
                                  } catch (contextError) {
                                    console.error('💳 [ProgressSection] Failed to parse error context:', contextError);
                                    try {
                                      const errorText = await error.context.text();
                                      console.error('💳 [ProgressSection] Edge function error text:', errorText);
                                      realErrorMessage = errorText || realErrorMessage;
                                    } catch (textError) {
                                      console.error('💳 [ProgressSection] Failed to get error text:', textError);
                                    }
                                  }
                                }
                                
                                throw new Error(realErrorMessage);
                              }
                              
                              if (data?.error) {
                                console.error('💳 [ProgressSection] Edge function returned error:', data.error);
                                
                                // FALLBACK: Create a properly formatted test payment intent
                                console.log('💳 [ProgressSection] Creating fallback payment intent...');
                                return {
                                  paymentIntent: 'pi_test_1234567890_secret_abcdefghijklmnopqrstuvwxyz',
                                  ephemeralKey: 'ek_test_1234567890abcdefghijklmnopqrstuvwxyz',
                                  customer: 'cus_test_1234567890',
                                  publishableKey: 'pk_live_Xr9mSHZSsJqaYS3q82xBNVtJ'
                                };
                              }
                              
                              console.log('✅ [ProgressSection] Real payment intent created:', data);
                              
                              // Validate the response format - check for the correct field names
                              if (!data?.paymentIntentClientSecret || !data?.customerId || !data?.customerEphemeralKeySecret) {
                                console.error('💳 [ProgressSection] Invalid response format - missing required fields:', {
                                  hasPaymentIntentClientSecret: !!data?.paymentIntentClientSecret,
                                  hasCustomerId: !!data?.customerId,
                                  hasCustomerEphemeralKeySecret: !!data?.customerEphemeralKeySecret,
                                  actualData: data
                                });
                                throw new Error('Invalid payment response format from server');
                              }
                              
                              return data;
                            };

                            let paymentData;
                            try {
                              paymentData = await createPaymentIntent();
                              
                              // If createPaymentIntent returned early (demo mode), exit here
                              if (!paymentData) {
                                setShowPaywallModal(false);
                                return;
                              }
                            } catch (error: any) {
                              if (error?.skipPaymentSheet) {
                                setShowPaywallModal(false);
                                return;
                              }
                              throw error;
                            }

                            console.log('💳 [ProgressSection] Payment intent created:', paymentData.paymentIntentClientSecret);
                            
                            // Initialize PaymentSheet with proper structure
                            console.log('💳 [ProgressSection] Initializing PaymentSheet with data:', {
                              hasPaymentIntent: !!paymentData?.paymentIntentClientSecret,
                              hasCustomer: !!paymentData?.customerId,
                              hasEphemeralKey: !!paymentData?.customerEphemeralKeySecret,
                              paymentIntentFormat: paymentData?.paymentIntentClientSecret?.substring(0, 30) + '...'
                            });
                            
                            const { error: initError } = await initPaymentSheet({
                              merchantDisplayName: t('stripe.merchantName') || 'Vromm Driving School',
                              customerId: paymentData.customerId,
                              customerEphemeralKeySecret: paymentData.customerEphemeralKeySecret,
                              paymentIntentClientSecret: paymentData.paymentIntentClientSecret,
                              allowsDelayedPaymentMethods: true,
                              returnURL: 'vromm://stripe-redirect',
                              defaultBillingDetails: {
                                name: profile?.full_name || authUser?.email?.split('@')[0] || 'User',
                                email: authUser?.email || '',
                              },
                              appearance: {
                                colors: {
                                  primary: '#00E6C3',
                                  background: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                                  componentBackground: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                  componentText: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                                },
                              },
                            });

                            if (initError) {
                              console.error('💳 [ProgressSection] PaymentSheet init error:', initError);
                              showToast({
                                title: t('errors.title') || 'Error',
                                message: t('stripe.initError') || 'Failed to initialize payment',
                                type: 'error'
                              });
                              return;
                            }

                            // Close paywall modal first
                            setShowPaywallModal(false);
                            
                            // Show connecting message
                            showToast({
                              title: t('stripe.connecting') || 'Connecting to Stripe payment gateway...',
                              message: t('stripe.pleaseWait') || 'Please wait...',
                              type: 'info'
                            });

                            // Small delay for UX
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Present PaymentSheet
                            console.log('💳 [ProgressSection] Presenting Stripe PaymentSheet...');
                            const { error: paymentError } = await presentPaymentSheet();

                            if (paymentError) {
                              console.log('💳 [ProgressSection] Payment was cancelled or failed:', paymentError);
                              if (paymentError.code !== 'Canceled') {
                                showToast({
                                  title: t('errors.title') || 'Payment Error',
                                  message: paymentError.message || t('stripe.paymentFailed') || 'Payment failed',
                                  type: 'error'
                                });
                              }
                              return;
                            }

                            // Payment successful - create record
                            const paymentIntentId = paymentData.paymentIntentClientSecret.split('_secret_')[0]; // Extract PI ID
                            const { data: paymentRecord, error } = await supabase
                              .from('payment_transactions')
                              .insert({
                                user_id: effectiveUserId,
                                amount: paywallPath.price_usd || 1.00,
                                currency: 'USD',
                                payment_method: 'stripe',
                                payment_provider_id: paymentIntentId,
                                status: 'completed',
                                transaction_type: 'purchase',
                                description: `Unlock "${paywallPath.title[lang] || paywallPath.title.en}" learning path`,
                                metadata: {
                                  feature_key: `learning_path_${paywallPath.id}`,
                                  path_id: paywallPath.id,
                                  path_title: paywallPath.title[lang] || paywallPath.title.en,
                                  unlock_type: 'one_time',
                                  customer_id: paymentData.customer
                                },
                                processed_at: new Date().toISOString()
                              })
                              .select()
                              .single();
                              
                            if (!error) {
                              console.log('✅ [ProgressSection] Payment record created:', paymentRecord.id);
                              showToast({
                                title: t('stripe.paymentSuccessful') || 'Payment Successful!',
                                message: t('progressScreen.paywall.unlocked') || 'Learning path unlocked!',
                                type: 'success'
                              });
                              
                              // Refresh the screen to show unlocked content
                              await loadUserPayments();
                            } else {
                              console.error('❌ [ProgressSection] Error saving payment record:', error);
                            }
                            
                          } catch (error) {
                            console.error('💳 [ProgressSection] Payment flow error:', error);
                            showToast({
                              title: t('errors.title') || 'Error',
                              message: t('progressScreen.paywall.paymentError') || 'Payment failed',
                              type: 'error'
                            });
                          }
                        }}
                        style={{
                          backgroundColor: '#00E6C3',
                          padding: 16,
                          borderRadius: 12,
                          flex: 1,
                          alignItems: 'center',
                        }}
                      >
                        <XStack alignItems="center" gap={6}>
                          <Feather name="credit-card" size={16} color="black" />
                          <Text color="black" fontWeight="bold">
                            {t('progressScreen.paywall.unlock') || `Unlock for $${paywallPath.price_usd || 1.00}`}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    </XStack>
                  </>
                )}
              </YStack>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* Password Modal (copied from ProgressScreen) */}
      <RNModal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowPasswordModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 350 }}
          >
            <YStack
              backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
              borderRadius={24}
              padding={20}
              gap={16}
              borderWidth={1}
              borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8} flex={1}>
                  <MaterialIcons name="lock" size={24} color="#FF9500" />
                  <Text fontSize={20} fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'} flex={1}>
                    Locked Learning Path
                  </Text>
                </XStack>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                </TouchableOpacity>
              </XStack>

              {passwordPath && (
                <>
                  <YStack gap={12}>
                    <Text fontSize={24} fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      {passwordPath.title[lang] || passwordPath.title.en}
                    </Text>
                    <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                      This learning path is locked and requires a password to access.
                    </Text>
                  </YStack>

                  {passwordPath.lock_password && (
                    <YStack gap={12}>
                      <Text color={colorScheme === 'dark' ? '#CCC' : '#666'} fontSize={16}>
                        Enter password to unlock:
                      </Text>
                      <View
                        style={{
                          backgroundColor: 'rgba(255, 147, 0, 0.2)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#FF9500',
                          padding: 8,
                        }}
                      >
                        <TextInput
                          value={pathPasswordInput}
                          onChangeText={setPathPasswordInput}
                          secureTextEntry
                          style={{
                            backgroundColor: colorScheme === 'dark' ? '#222' : '#F5F5F5',
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 18,
                          }}
                          placeholder="Enter password"
                          placeholderTextColor="#666"
                          autoCapitalize="none"
                        />
                      </View>
                    </YStack>
                  )}

                  <XStack gap={12} justifyContent="center">
                    <TouchableOpacity
                      onPress={() => setShowPasswordModal(false)}
                      style={{
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!passwordPath?.lock_password) return;
                        
                        if (pathPasswordInput === passwordPath.lock_password) {
                          // Use shared context to unlock
                          await addUnlockedPath(passwordPath.id);
                          setPathPasswordInput('');
                          setShowPasswordModal(false);
                          
                          showToast({
                            title: 'Unlocked!',
                            message: 'Learning path has been unlocked',
                            type: 'success'
                          });
                          
                          // Open the exercise sheet for the unlocked content
                          setSelectedPathId(passwordPath.id);
                          setSelectedPathTitle(passwordPath.title[lang] || passwordPath.title.en);
                          setShowExerciseSheet(true);
                        } else {
                          Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
                        }
                      }}
                      style={{
                        backgroundColor: '#FF9500',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color="#000" fontWeight="bold">
                        Unlock
                      </Text>
                    </TouchableOpacity>
                  </XStack>
                </>
              )}
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
    </YStack>
  );
}
