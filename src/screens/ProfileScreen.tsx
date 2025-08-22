import React, { useState, useCallback, useEffect } from 'react';
import { YStack, XStack, Switch, useTheme, Card, Input } from 'tamagui';
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
  TextInput,
  Dimensions,
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
import { resetOnboarding } from '../components/Onboarding';
import { resetOnboardingForCurrentUser } from '../services/onboardingService';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { forceRefreshTranslations, debugTranslations } from '../services/translationService';
import { useTranslation } from '../contexts/TranslationContext';
import { Language } from '../contexts/TranslationContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { inviteNewUser, inviteMultipleUsers, inviteUsersWithPasswords, getPendingInvitations, cancelInvitation, resendInvitation } from '../services/invitationService_v2';
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

export function ProfileScreen() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Delete account modal state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [optDeletePrivate, setOptDeletePrivate] = useState(false);
  const [optDeletePublic, setOptDeletePublic] = useState(false);
  const [optDeleteEvents, setOptDeleteEvents] = useState(false);
  const [optDeleteExercises, setOptDeleteExercises] = useState(false);
  const [optDeleteReviews, setOptDeleteReviews] = useState(false);
  const [optTransferPublic, setOptTransferPublic] = useState(true);
  
  const theme = useTheme();
  const colorScheme = useColorScheme();
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

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Add driving stats state
  const [drivingStats, setDrivingStats] = useState<DrivingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
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
    location: profile?.location || '',
    role: profile?.role || ('student' as UserRole),
    experience_level: profile?.experience_level || ('beginner' as ExperienceLevel),
    private_profile: profile?.private_profile || false,
    location_lat: profile?.location_lat || null,
    location_lng: profile?.location_lng || null,
    avatar_url: profile?.avatar_url || null,
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Monitor the database call with expected fields
      await monitorDatabaseCall(() => updateProfile(formData), 'profiles', 'update', [
        'id',
        'full_name',
        'location',
        'role',
        'experience_level',
        'private_profile',
        'avatar_url',
        'updated_at',
      ]);

      checkMemoryUsage('ProfileScreen.handleUpdate');
      logInfo('Profile updated successfully', { formData });

      // Refresh the PublicProfile when navigating back
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Navigate to the public profile view
        navigation.navigate('PublicProfile', {
          userId: profile?.id || '',
        });
      }

      // Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      logError('Profile update failed', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const SYSTEM_PROFILE_UUID = '22f2bccb-efb5-4f67-85fd-8078a25acebc';

  const handleConfirmDeleteAccount = async () => {
    try {
      if (!user?.id) return;
      const { error } = await supabase.rpc('process_user_account_deletion', {
        p_user_id: user.id,
        p_delete_private_routes: optDeletePrivate,
        p_delete_public_routes: optDeletePublic,
        p_delete_events: optDeleteEvents,
        p_delete_exercises: optDeleteExercises,
        p_delete_reviews: optDeleteReviews,
        p_transfer_public_to: optTransferPublic ? SYSTEM_PROFILE_UUID : null,
      });
      if (error) throw error;

      await supabase.auth.signOut();
      Alert.alert(t('deleteAccount.successTitle') || 'Account deleted', t('deleteAccount.successMessage') || 'Your account was deleted.');
    } catch (err) {
      console.error('Delete account error:', err);
      Alert.alert('Error', (err as any)?.message || 'Failed to delete account');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const detectLocation = useCallback(async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please enable location services to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationString = [address.street, address.city, address.region, address.country]
        .filter(Boolean)
        .join(', ');

      setFormData((prev) => ({
        ...prev,
        location: locationString,
        location_lat: location.coords.latitude,
        location_lng: location.coords.longitude,
      }));
    } catch (err) {
      Alert.alert('Error', 'Failed to detect location');
    } finally {
      setLoading(false);
    }
  }, []);

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

              Alert.alert('Success', t('profile.refreshSuccess'));
            } catch (err) {
              console.error('Error refreshing translations:', err);
              Alert.alert(t('common.error'), 'Failed to refresh translations');
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
          Alert.alert('Permission needed', 'Camera permission is required to take a photo');
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
          Alert.alert('Permission needed', 'Media library permission is required');
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
      Alert.alert('Error', errorMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Delete avatar handler
  const handleDeleteAvatar = async () => {
    try {
      setAvatarUploading(true);
      await updateProfile({ ...formData, avatar_url: null });
      setFormData((prev) => ({ ...prev, avatar_url: null }));
      Alert.alert('Success', 'Avatar removed!');
    } catch (err) {
      Alert.alert('Error', 'Failed to delete avatar');
    } finally {
      setAvatarUploading(false);
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
          supervisor_name: rel.profiles?.full_name || 'Unknown Supervisor',
          supervisor_email: rel.profiles?.email || '',
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
              school_name: membership.schools.name,
              school_location: membership.schools.location,
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
        Alert.alert('Success', 'You have left your supervisor');
        // Refresh the relationships
        await getUserProfileWithRelationships(profile.id);
      }

      return success;
    } catch (error) {
      logError('Error leaving supervisor', error as Error);
      Alert.alert('Error', 'Failed to leave supervisor');
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
        Alert.alert('Success', 'You have left the school');
        // Refresh the relationships
        await getUserProfileWithRelationships(profile.id);
      }

      return success;
    } catch (error) {
      logError('Error leaving school', error as Error);
      Alert.alert('Error', 'Failed to leave school');
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
        data.forEach(supervisor => {
          console.log('🔍 Supervisor found:', { 
            id: supervisor.id, 
            name: supervisor.full_name, 
            email: supervisor.email, 
            role: supervisor.role 
          });
        });
      }
      setAvailableSupervisors(data || []);
    } catch (error) {
      logError('Error fetching supervisors', error as Error);
      Alert.alert('Error', 'Failed to load available supervisors');
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
      setAvailableStudents(data || []);
    } catch (error) {
      logError('Error fetching students', error as Error);
      Alert.alert('Error', 'Failed to load available students');
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
        profile.full_name || profile.email || 'Unknown User',
        profile.role || 'user',
        invitationType,
      );

      Alert.alert(
        'Invitation Sent! 🎉',
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
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    }
  };

  // Handle bulk email invitations for new users with custom passwords
  const handleBulkInvite = async () => {
    try {
      const validEmails = inviteEmails.filter(email => email.includes('@'));
      if (validEmails.length === 0) {
        Alert.alert('Invalid Emails', 'Please enter valid email addresses');
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
          'Invitations Sent! 🎉',
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
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
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
      Alert.alert('Success', 'Invitation resent successfully');
    } else {
      Alert.alert('Error', 'Failed to resend invitation');
    }
  };

  // Cancel an invitation
  const handleCancelInvite = async (invitationId: string) => {
    Alert.alert(
      'Cancel Invitation',
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
              Alert.alert('Success', 'Invitation cancelled');
            } else {
              Alert.alert('Error', 'Failed to cancel invitation');
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
            full_name: profile.full_name || 'Unknown Student',
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
        Alert.alert('Debug Info', 'No schools found in database. Check console for details.');
        return;
      }

      console.log(`🏫 SUCCESS: Found ${data.length} schools`);
      setAvailableSchools(data);
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
          'Supervision Requests Sent! 📤',
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
      Alert.alert('Error', 'Failed to join school');
    }
  };

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
      Alert.alert('Student View Active', `You are now viewing ${studentName || "this student"}'s progress and data.`);
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
        Alert.alert('Success', 'You have removed your supervisor and submitted your review');
        if (profile?.id) {
          await getUserProfileWithRelationships(profile.id);
        }
      } else {
        Alert.alert('Error', 'Failed to remove supervisor');
      }
    } catch (error) {
      console.error('Error removing supervisor:', error);
      Alert.alert('Error', 'Failed to remove supervisor');
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
          backgroundColor="rgba(0, 0, 0, 0.1)"
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
                    <Feather name="user" size={16} color={colorScheme === 'dark' ? 'white' : 'black'} />
                    <Text>View Student</Text>
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
                  <Feather name="eye" size={16} color={colorScheme === 'dark' ? 'white' : 'black'} />
                  <Text>View Profile</Text>
                </XStack>
              </Button>
            </XStack>
          }
        />
        <YStack gap={24}>
          <YStack gap={24} paddingBottom={56}>
            <YStack alignItems="center" marginTop={24} marginBottom={8}>
              <View style={{ position: 'relative' }}>
                {formData.avatar_url ? (
                  <View>
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
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}
                      onPress={handleDeleteAvatar}
                      disabled={avatarUploading}
                      backgroundColor="$red10"
                    >
                      <Feather name="trash-2" size={16} color="white" />
                    </Button>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handlePickAvatar(false)}
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
                  </Pressable>
                )}
              </View>
              <XStack gap={8} marginTop={8}>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => handlePickAvatar(false)}
                  disabled={avatarUploading}
                >
                  <Feather name="image" size={16} color="#4287f5" />
                  <Text ml={4}>Pick from Library</Text>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => handlePickAvatar(true)}
                  disabled={avatarUploading}
                >
                  <Feather name="camera" size={16} color="#4287f5" />
                  <Text ml={4}>Take Photo</Text>
                </Button>
              </XStack>
              
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
            </YStack>

            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">
                {t('profile.fullName')}
              </Text>
              <FormField
                value={formData.full_name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, full_name: text }))}
                placeholder={t('profile.fullNamePlaceholder')}
                autoCapitalize="none"
              />
            </YStack>

            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">
                {t('profile.location')}
              </Text>
              <FormField
                value={formData.location}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                placeholder={t('profile.locationPlaceholder')}
                autoCapitalize="none"
                rightElement={
                  <Button
                    onPress={detectLocation}
                    disabled={loading}
                    variant="secondary"
                    padding="$2"
                    backgroundColor="transparent"
                    borderWidth={0}
                  >
                    <Feather
                      name="map-pin"
                      size={20}
                      color={colorScheme === 'dark' ? 'white' : 'black'}
                    />
                  </Button>
                }
              />
            </YStack>

            <Button onPress={() => setShowRoleModal(true)} variant="secondary" size="lg">
              <Text color="$color">
                {formData.role === 'student'
                  ? t('profile.roles.student')
                  : formData.role === 'instructor'
                    ? t('profile.roles.instructor')
                    : t('profile.roles.school')}
              </Text>
            </Button>

            <Button onPress={() => setShowExperienceModal(true)} variant="secondary" size="lg">
              <Text color="$color">
                {formData.experience_level === 'beginner'
                  ? t('profile.experienceLevels.beginner')
                  : formData.experience_level === 'intermediate'
                    ? t('profile.experienceLevels.intermediate')
                    : t('profile.experienceLevels.advanced')}
              </Text>
            </Button>

            <Button onPress={() => setShowLanguageModal(true)} variant="secondary" size="lg">
              <Text color="$color">{LANGUAGE_LABELS[language]}</Text>
            </Button>

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
                        <Text color="white">Manage Students</Text>
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
                        <Text color="white">Invite Students</Text>
                      </Button>
                    </XStack>
                  </XStack>

                  {activeStudentId ? (
                    <YStack gap="$1">
                      <Text color="$green11" size="sm">
                        🎯 Active View: {getActiveUser().full_name}
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
                        <Text>Switch Back to My View</Text>
                      </Button>
                    </YStack>
                  ) : supervisedStudents.length > 0 ? (
                    <YStack gap="$1">
                      <Text color="$gray11" size="sm">
                        👨‍🏫 Managing {supervisedStudents.length} student
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
                        👥 No supervised students yet
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
                        <Text color="white">Leave</Text>
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
                        <Text color="white">Leave</Text>
                      </Button>
                    </XStack>
                  ))
                )}
              </YStack>
            </Card>

            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$2">
                <Text size="lg" weight="bold" color="$color">
                  Körkortsplan
                </Text>
                <Text color="$gray11">
                  {profile?.license_plan_completed
                    ? 'Din körkortsplan är ifylld'
                    : 'Du har inte fyllt i din körkortsplan än'}
                </Text>
                <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
                  <Text
                    weight="bold"
                    color={profile?.license_plan_completed ? '$green10' : '$blue10'}
                  >
                    {profile?.license_plan_completed ? '100% Klar' : '0% Klar'}
                  </Text>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => navigation.navigate('LicensePlanScreen')}
                  >
                    {profile?.license_plan_completed ? 'Redigera' : 'Fyll i'}
                  </Button>
                </XStack>
              </YStack>
            </Card>

            {/* Driving Statistics Section */}
            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text size="lg" weight="bold" color="$color">
                    {t('profile.stats.title') || '📊 Driving Statistics'}
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
                        {t('profile.stats.weeklyTime') || '⏱️ Weekly Time'}
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
                      <Text color="white">Check for Data</Text>
                    </Button>
                  </YStack>
                )}
              </YStack>
            </Card>

            <XStack
              justifyContent="space-between"
              alignItems="center"
              backgroundColor={formData.private_profile ? '$blue4' : undefined}
              padding="$4"
              borderRadius="$4"
              pressStyle={{
                scale: 0.98,
              }}
              onPress={() =>
                setFormData((prev) => ({ ...prev, private_profile: !prev.private_profile }))
              }
            >
              <Text size="lg" color="$color">
                {t('profile.privateProfile')}
              </Text>
              <Switch
                size="$6"
                checked={formData.private_profile}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, private_profile: checked }))
                }
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
            <Card bordered padding="$4" marginVertical="$2">
              <YStack gap="$3">
                <Text size="lg" weight="bold" color="$color">
                  🔔 Notification Settings
                </Text>

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
                        // Save sound setting directly with AsyncStorage
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
                          // Play test sound
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
                  variant="secondary"
                  size="sm"
                  backgroundColor="$gray7"
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
                  <Text>🔄 Update Badge Count</Text>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  backgroundColor="$purple9"
                  onPress={async () => {
                    try {
                      Alert.alert('Test Sounds', 'Choose a sound to test:', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: '🔔 Notification Sound',
                          onPress: async () => {
                            await pushNotificationService.playNotificationSound('notification');
                          },
                        },
                        {
                          text: '💬 Message Sound',
                          onPress: async () => {
                            await pushNotificationService.playNotificationSound('message');
                          },
                        },
                        {
                          text: '📱 System Sound',
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
                  <Text color="white">🎵 Test Sounds</Text>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  backgroundColor="$red9"
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
                  <Text color="white">🗑️ Clear All Notifications</Text>
                </Button>
              </YStack>
            </Card>

            <Button onPress={handleShowOnboarding} variant="secondary" size="lg">
              <XStack gap="$2" alignItems="center">
                <Feather
                  name="help-circle"
                  size={20}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
                <Text>{t('profile.onboardingTour')}</Text>
              </XStack>
            </Button>

            <Button onPress={navigateToOnboardingDemo} variant="secondary" size="lg">
              <XStack gap="$2" alignItems="center">
                <Feather
                  name="refresh-cw"
                  size={20}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
                <Text>{t('profile.contentUpdatesDemo')}</Text>
              </XStack>
            </Button>

            <Button onPress={navigateToTranslationDemo} variant="secondary" size="lg">
              <XStack gap="$2" alignItems="center">
                <Feather
                  name="globe"
                  size={20}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
                <Text>{t('profile.translationDemo')}</Text>
              </XStack>
            </Button>

            {error ? (
              <Text size="sm" intent="error" textAlign="center">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={handleUpdate}
              disabled={loading}
              variant="primary"
              size="lg"
              backgroundColor="$blue10"
            >
              {loading ? t('profile.updating') : t('profile.updateProfile')}
            </Button>

            <XStack gap="$2">
              <Button onPress={handleSignOut} disabled={loading} variant="secondary" size="lg">
                {t('profile.signOut')}
              </Button>
              <Button
                onPress={() => setShowDeleteDialog(true)}
                disabled={loading}
                variant="secondary"
                size="lg"
              >
                {t('settings.deleteAccount') || 'Delete Account'}
              </Button>
            </XStack>

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

            <Card bordered padding="$4" marginTop="$4">
              <YStack gap={8}>
                <Text size="lg" weight="bold" mb="$2" color="$color">
                  {t('profile.developerOptions')}
                </Text>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={navigateToOnboardingDemo}
                  marginBottom="$2"
                >
                  {t('profile.contentUpdatesDemo')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={navigateToTranslationDemo}
                  marginBottom="$2"
                >
                  {t('profile.translationDemo')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={handleShowOnboarding}
                  marginBottom="$2"
                >
                  {t('profile.onboardingTour')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={handleResetOnboarding}
                  marginBottom="$2"
                >
                  {t('profile.resetOnboarding')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={refreshTranslations}
                  marginBottom="$2"
                >
                  {t('profile.refreshTranslations')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={async () => {
                    try {
                      const { getStoredCrashReports, clearOldCrashReports } = await import(
                        '../components/ErrorBoundary'
                      );
                      const { getCrashReport } = await import('../utils/logger');
                      const currentLogs = getCrashReport();
                      const storedCrashes = await getStoredCrashReports();
                      const perfSummary = getPerformanceSummary();

                      checkMemoryUsage('ProfileScreen.debugExport');
                      checkForPotentialIssues('ProfileScreen.debugExport');

                      logInfo('Debug logs exported', {
                        currentLogsLength: currentLogs.length,
                        storedCrashCount: storedCrashes.length,
                        performance: perfSummary,
                      });

                      Alert.alert(
                        'Debug & Performance Report',
                        `Session Runtime: ${perfSummary.totalRuntime}s
Memory Allocations: ${perfSummary.memoryAllocations}
Database Calls: ${perfSummary.databaseCalls}
Network Calls: ${perfSummary.networkCalls}
Warnings: ${perfSummary.warnings}
Errors: ${perfSummary.errors}
Avg Calls/Min: ${perfSummary.avgCallsPerMinute}

Current Logs: ${currentLogs.length} chars
Stored Crashes: ${storedCrashes.length}

Recent Errors:
${perfSummary.recentErrors.join('\n')}`,
                        [
                          { text: 'OK' },
                          {
                            text: 'Clear All Data',
                            style: 'destructive',
                            onPress: async () => {
                              await clearOldCrashReports(0); // Clear all
                              Alert.alert('Success', 'All debug data cleared');
                            },
                          },
                        ],
                      );
                    } catch (error) {
                      logError('Failed to export debug logs', error as Error);
                    }
                  }}
                  marginBottom="$2"
                >
                  Performance & Debug Report
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={async () => {
                    try {
                      checkMemoryUsage('ProfileScreen.memoryCheck');
                      checkForPotentialIssues('ProfileScreen.manualCheck');

                      // Test database connection
                      const dbStart = Date.now();
                      await monitorDatabaseCall(
                        async () => {
                          const { data, error } = await supabase
                            .from('profiles')
                            .select('id')
                            .limit(1);
                          if (error) throw error;
                          return data;
                        },
                        'profiles',
                        'select',
                        ['id'],
                      );
                      const dbTime = Date.now() - dbStart;

                      // Test network connection
                      const netStart = Date.now();
                      try {
                        await monitorNetworkCall(
                          () => fetch('https://httpbin.org/delay/0'),
                          'https://httpbin.org/delay/0',
                          'GET',
                        );
                      } catch (e) {
                        // Network test failed - that's ok
                      }
                      const netTime = Date.now() - netStart;

                      const perfSummary = getPerformanceSummary();

                      Alert.alert(
                        'System Health Check',
                        `Database Response: ${dbTime}ms ${dbTime > 1000 ? '⚠️' : '✅'}
Network Response: ${netTime}ms ${netTime > 2000 ? '⚠️' : '✅'}
Memory Allocations: ${perfSummary.memoryAllocations}
Total Runtime: ${perfSummary.totalRuntime}s
Recent Issues: ${perfSummary.recentErrors.length}

${
  dbTime > 2000
    ? '⚠️ Database is slow'
    : netTime > 3000
      ? '⚠️ Network is slow'
      : perfSummary.memoryAllocations > 1000
        ? '⚠️ High memory usage'
        : '✅ All systems normal'
}`,
                      );
                    } catch (error) {
                      logError('Health check failed', error as Error);
                      Alert.alert('Health Check Failed', 'See logs for details');
                    }
                  }}
                  marginBottom="$2"
                >
                  System Health Check
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={async () => {
                    try {
                      console.log('🔍 Manual invitation check triggered');
                      await checkForPendingInvitations();
                      Alert.alert('Invitation Check', 'Checked for pending invitations. See console for details.');
                    } catch (error) {
                      logError('Failed to check invitations', error as Error);
                      Alert.alert('Error', 'Failed to check for invitations');
                    }
                  }}
                  marginBottom="$2"
                >
                  📥 Check for Invitations
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={() => {
                    console.log('🧪 Force showing global invitation modal for testing');
                    // This will be handled by the global modal in App.tsx
                    Alert.alert('Test Info', 'Global invitation modal is now handled at app level. Check for real invitations.');
                  }}
                  marginBottom="$2"
                >
                  🧪 Test Global Invitations
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={async () => {
                    try {
                      if (!profile?.id) {
                        Alert.alert('Error', 'User not found');
                        return;
                      }

                      Alert.alert('Test Notifications', 'Choose a notification type to test:', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'General Test',
                          onPress: async () => {
                            await pushNotificationService.sendTestNotification(
                              profile.id,
                              'general',
                            );
                            Alert.alert('Success', 'Test notification sent!');
                          },
                        },
                        {
                          text: 'Route Test',
                          onPress: async () => {
                            await pushNotificationService.sendTestNotification(profile.id, 'route');
                            Alert.alert('Success', 'Route test notification sent!');
                          },
                        },
                        {
                          text: 'Follow Test',
                          onPress: async () => {
                            await pushNotificationService.sendTestNotification(
                              profile.id,
                              'follow',
                            );
                            Alert.alert('Success', 'Follow test notification sent!');
                          },
                        },
                        {
                          text: 'Message Test',
                          onPress: async () => {
                            await pushNotificationService.sendTestNotification(
                              profile.id,
                              'message',
                            );
                            Alert.alert('Success', 'Message test notification sent!');
                          },
                        },
                      ]);
                    } catch (error) {
                      logError('Failed to send test notification', error as Error);
                      Alert.alert('Error', 'Failed to send test notification');
                    }
                  }}
                  marginBottom="$2"
                >
                  🔔 Test Push Notifications
                </Button>
              </YStack>
            </Card>
          </YStack>
        </YStack>
      </YStack>

      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowRoleModal(false)}
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
          >
            <Text size="xl" weight="bold" color="$color">
              {t('profile.roles.title')}
            </Text>
            <YStack gap="$2">
              {USER_ROLES.map((role) => (
                <Button
                  key={role}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, role: role as UserRole }));
                    setShowRoleModal(false);
                    updateProfile({
                      role: role as UserRole,
                      role_confirmed: true,
                    });
                  }}
                  variant={formData.role === role ? 'primary' : 'secondary'}
                  backgroundColor={formData.role === role ? '$blue10' : undefined}
                  size="lg"
                >
                  {role === 'student'
                    ? t('profile.roles.student')
                    : role === 'instructor'
                      ? t('profile.roles.instructor')
                      : t('profile.roles.school')}
                </Button>
              ))}
            </YStack>
            <Button
              onPress={() => setShowRoleModal(false)}
              variant="secondary"
              size="lg"
              backgroundColor="$backgroundHover"
            >
              {t('common.cancel')}
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      <Modal
        visible={showExperienceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExperienceModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowExperienceModal(false)}
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
          >
            <Text size="xl" weight="bold" color="$color">
              {t('profile.experienceLevels.title')}
            </Text>
            <YStack gap="$2">
              {EXPERIENCE_LEVELS.map((level) => (
                <Button
                  key={level}
                  onPress={() => {
                    setFormData((prev) => ({
                      ...prev,
                      experience_level: level as ExperienceLevel,
                    }));
                    setShowExperienceModal(false);
                  }}
                  variant={formData.experience_level === level ? 'primary' : 'secondary'}
                  backgroundColor={formData.experience_level === level ? '$blue10' : undefined}
                  size="lg"
                >
                  {level === 'beginner'
                    ? t('profile.experienceLevels.beginner')
                    : level === 'intermediate'
                      ? t('profile.experienceLevels.intermediate')
                      : t('profile.experienceLevels.advanced')}
                </Button>
              ))}
            </YStack>
            <Button
              onPress={() => setShowExperienceModal(false)}
              variant="secondary"
              size="lg"
              backgroundColor="$backgroundHover"
            >
              {t('common.cancel')}
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowLanguageModal(false)}
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
          >
            <Text size="xl" weight="bold" color="$color">
              {t('settings.language.title')}
            </Text>
            <YStack gap="$2">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang}
                  onPress={async () => {
                    await setLanguage(lang);
                    setShowLanguageModal(false);
                  }}
                  variant={language === lang ? 'primary' : 'secondary'}
                  backgroundColor={language === lang ? '$blue10' : undefined}
                  size="lg"
                >
                  {LANGUAGE_LABELS[lang]}
                </Button>
              ))}
            </YStack>
            <Button
              onPress={() => setShowLanguageModal(false)}
              variant="secondary"
              size="lg"
              backgroundColor="$backgroundHover"
            >
              {t('common.cancel')}
            </Button>
          </YStack>
        </Pressable>
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
                <Text color={inviteEmails.length === 0 ? 'white' : '$color'}>Search Existing</Text>
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
                <Text color={inviteEmails.length > 0 ? 'white' : '$color'}>Invite New</Text>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  fetchPendingInvitations();
                  setShowPendingInvites(!showPendingInvites);
                }}
              >
                <Text color="$color">Pending ({pendingInvitations.length})</Text>
              </Button>
            </XStack>

            {/* Email invite mode */}
            {inviteEmails.length > 0 ? (
              <YStack gap="$2">
                <Text size="sm" color="$gray11">Enter email addresses and passwords (leave password blank for auto-generated)</Text>
                
                {/* Custom message field */}
                <YStack gap="$1">
                  <Text size="sm" color="$gray11">Optional personal message:</Text>
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
                      👥 No supervised students
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
                <Switch value={optDeletePrivate} onValueChange={setOptDeletePrivate} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deletePublicRoutes') || 'Delete my public routes'}</Text>
                <Switch value={optDeletePublic} onValueChange={setOptDeletePublic} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteEvents') || 'Delete my events'}</Text>
                <Switch value={optDeleteEvents} onValueChange={setOptDeleteEvents} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteExercises') || 'Delete my user exercises'}</Text>
                <Switch value={optDeleteExercises} onValueChange={setOptDeleteExercises} />
              </XStack>
              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.deleteReviews') || 'Delete my reviews'}</Text>
                <Switch value={optDeleteReviews} onValueChange={setOptDeleteReviews} />
              </XStack>

              <XStack ai="center" jc="space-between">
                <Text>{t('deleteAccount.transferToggle') || 'Transfer public content to system account'}</Text>
                <Switch value={optTransferPublic} onValueChange={setOptTransferPublic} />
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
          profileUserId={removalTargetSupervisor.id}
          profileUserRole="instructor"
          profileUserName={removalTargetSupervisor.name}
          canReview={true}
          reviews={[]}
          onReviewAdded={loadRelationshipReviews}
          title={`Review ${removalTargetSupervisor.name}`}
          subtitle="Please share your experience before ending this supervisory relationship"
          isRemovalContext={true}
          onRemovalComplete={handleRemovalComplete}
        />
      )}
    </Screen>
  );
}
