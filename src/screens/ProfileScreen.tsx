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
import { inviteNewUser, inviteMultipleUsers, getPendingInvitations, cancelInvitation, resendInvitation } from '../services/invitationService';
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
  const { profile, updateProfile, signOut } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const navigation = useNavigation<RootStackNavigationProp>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [supervisors, setSupervisors] = useState<
    Array<{ supervisor_id: string; supervisor_name: string; supervisor_email: string }>
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
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  
  // Use StudentSwitchContext for managing active student
  const { activeStudentId, setActiveStudent, clearActiveStudent } = useStudentSwitch();

  // Invitation system states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteType, setInviteType] = useState<'supervisor' | 'student' | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showPendingInvites, setShowPendingInvites] = useState(false);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Add driving stats state
  const [drivingStats, setDrivingStats] = useState<DrivingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
          console.error('Error fetching supervisors:', supervisorsError);
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

  // Fetch available supervisors from database
  const fetchAvailableSupervisors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setAvailableSupervisors(data || []);
    } catch (error) {
      logError('Error fetching supervisors', error as Error);
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

  // Handle bulk email invitations for new users
  const handleBulkInvite = async () => {
    try {
      const validEmails = inviteEmails.filter(email => email.includes('@'));
      if (validEmails.length === 0) {
        Alert.alert('Invalid Emails', 'Please enter valid email addresses');
        return;
      }

      const role = inviteType === 'student' ? 'student' : 'instructor';
      const result = await inviteMultipleUsers(
        validEmails,
        role,
        profile?.id,
        profile?.full_name || profile?.email
      );

      if (result.successful.length > 0) {
        Alert.alert(
          'Invitations Sent! 🎉',
          `Successfully invited ${result.successful.length} ${inviteType}(s). They will receive an email to create their account.`,
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
        .select('student_id')
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
        profiles?.map((profile) => ({
          id: profile.id,
          full_name: profile.full_name || 'Unknown Student',
          email: profile.email || '',
        })) || [];

      setSupervisedStudents(students);
      logInfo('Supervised students loaded', { studentCount: students.length });
    } catch (error) {
      logError('Error fetching supervised students', error as Error);
    }
  }, [profile?.id, logInfo, logError]);

  // Check if current user can supervise students (is teacher/instructor/admin/supervisor)
  const canSuperviseStudents = () => {
    const supervisorRoles = ['instructor', 'school', 'admin', 'teacher', 'supervisor'];
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

  // Join supervisors - Using proper student_supervisor_relationships table
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

      // Insert only new supervisor relationships
      const insertData = newSupervisorIds.map((supervisorId) => ({
        student_id: profile.id,
        supervisor_id: supervisorId,
      }));

      const { error } = await supabase.from('student_supervisor_relationships').insert(insertData);

      if (error) throw error;

      const addedCount = newSupervisorIds.length;
      const skippedCount = selectedSupervisorIds.length - addedCount;

      let message = `${addedCount} supervisor${addedCount !== 1 ? 's' : ''} added successfully`;
      if (skippedCount > 0) {
        message += `. ${skippedCount} already assigned.`;
      }

      Alert.alert('Success', message);

      // Refresh relationships and close modal
      await getUserProfileWithRelationships(profile.id);
      setShowSupervisorModal(false);
      setSelectedSupervisorIds([]);
    } catch (error) {
      logError('Error joining supervisors', error as Error);
      Alert.alert('Error', 'Failed to add supervisors');
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
    }
  }, [
    profile?.id,
    getUserProfileWithRelationships,
    fetchAvailableSupervisors,
    fetchAvailableSchools,
    fetchSupervisedStudents,
    fetchDrivingStats,
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

  return (
    <Screen
      scroll
      padding
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
                        onPress={() => {
                          fetchSupervisedStudents();
                          setShowStudentSelector(true);
                        }}
                      >
                        <Text color="white">
                          {activeStudentId ? 'Switch Student' : 'Select Student'}
                        </Text>
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

            {/* Supervisors Section - ALWAYS SHOW */}
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
                      onPress={() => {
                        fetchAvailableSupervisors();
                        setShowSupervisorModal(true);
                      }}
                      disabled={relationshipsLoading}
                    >
                      <Text color="white">
                        {supervisors.length > 0 ? 'Change' : 'Add Supervisors'}
                      </Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="$green9"
                      onPress={() => {
                        // Role-aware invitation: Students invite supervisors, Supervisors invite students
                        setInviteType(canSuperviseStudents() ? 'student' : 'supervisor');
                        setShowInviteModal(true);
                      }}
                    >
                      <Text color="white">
                        {canSuperviseStudents() ? 'Invite Students' : 'Invite Supervisors'}
                      </Text>
                    </Button>
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
                      </YStack>
                      <Button
                        size="sm"
                        variant="secondary"
                        backgroundColor="$red9"
                        onPress={() => {
                          Alert.alert(
                            'Leave Supervisor',
                            `Are you sure you want to leave ${supervisor.supervisor_name}?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Leave',
                                style: 'destructive',
                                onPress: () => leaveSupervisor(supervisor.supervisor_id),
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

            <Button onPress={handleSignOut} disabled={loading} variant="secondary" size="lg">
              {t('profile.signOut')}
            </Button>

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
                <Text size="sm" color="$gray11">Enter email addresses to invite (one per line)</Text>
                {inviteEmails.map((email, index) => (
                  <XStack key={index} gap="$2">
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
                        setInviteEmails(newEmails.length > 0 ? newEmails : ['']);
                      }}
                    >
                      <Feather name="x" size={16} />
                    </Button>
                  </XStack>
                ))}
                <XStack gap="$2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setInviteEmails([...inviteEmails, ''])}
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

            {/* Show pending invitations */}
            {showPendingInvites && pendingInvitations.length > 0 && (
              <YStack gap="$2" marginBottom="$2">
                <Text size="sm" weight="bold" color="$color">Pending Invitations</Text>
                {pendingInvitations.map((inv) => (
                  <Card key={inv.id} padding="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text fontSize="$3">{inv.email}</Text>
                        <Text fontSize="$2" color="$gray11">
                          {inv.role} • Sent {new Date(inv.created_at).toLocaleDateString()}
                        </Text>
                      </YStack>
                      <XStack gap="$1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => handleResendInvite(inv.id)}
                        >
                          <Feather name="send" size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          backgroundColor="$red9"
                          onPress={() => handleCancelInvite(inv.id)}
                        >
                          <Feather name="x" size={14} />
                        </Button>
                      </XStack>
                    </XStack>
                  </Card>
                ))}
              </YStack>
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
    </Screen>
  );
}
