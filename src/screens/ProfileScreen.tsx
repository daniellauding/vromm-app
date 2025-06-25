import { useState, useCallback } from 'react';
import { YStack, XStack, Switch, useTheme, Card } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import * as Location from 'expo-location';
import { Alert, Modal, View, Pressable, Image } from 'react-native';
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
import { useScreenLogger } from '../hooks/useScreenLogger';
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';
import {
  monitorDatabaseCall,
  monitorNetworkCall,
  checkMemoryUsage,
  checkForPotentialIssues,
  getPerformanceSummary,
} from '../utils/performanceMonitor';

type ExperienceLevel = Database['public']['Enums']['experience_level'];
type UserRole = Database['public']['Enums']['user_role'];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const USER_ROLES: UserRole[] = ['student', 'instructor', 'school'];
const LANGUAGES: Language[] = ['en', 'sv'];
const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  sv: 'Svenska',
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
      await monitorDatabaseCall(
        () => updateProfile(formData),
        'profiles',
        'update',
        ['id', 'full_name', 'location', 'role', 'experience_level', 'private_profile', 'avatar_url', 'updated_at']
      );

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

  return (
    <Screen scroll padding>
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
                        ]
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
                        ['id']
                      );
                      const dbTime = Date.now() - dbStart;

                      // Test network connection
                      const netStart = Date.now();
                      try {
                        await monitorNetworkCall(
                          () => fetch('https://httpbin.org/delay/0'),
                          'https://httpbin.org/delay/0',
                          'GET'
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
}`
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
    </Screen>
  );
}
