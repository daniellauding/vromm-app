import { useState, useCallback } from 'react';
import { YStack, XStack, Switch, useTheme, Card } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import * as Location from 'expo-location';
import { Alert, Modal, View, Pressable } from 'react-native';
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

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    role: profile?.role || ('student' as UserRole),
    experience_level: profile?.experience_level || ('beginner' as ExperienceLevel),
    private_profile: profile?.private_profile || false,
    location_lat: profile?.location_lat || null,
    location_lng: profile?.location_lng || null
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      await updateProfile(formData);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
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
        longitude: location.coords.longitude
      });

      const locationString = [address.street, address.city, address.region, address.country]
        .filter(Boolean)
        .join(', ');

      setFormData(prev => ({
        ...prev,
        location: locationString,
        location_lat: location.coords.latitude,
        location_lng: location.coords.longitude
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
      Alert.alert(
        t('profile.refreshTranslations'),
        t('profile.refreshConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel'
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
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error in refreshTranslations:', err);
      Alert.alert(t('common.error'), 'Failed to handle translations');
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <Screen scroll>
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={true}
      />

      <YStack f={1} gap={24}>
        <Header title={t('profile.title')} />
        <YStack gap={24}>
          <YStack gap={24} paddingBottom={56}>
            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">
                {t('profile.fullName')}
              </Text>
              <FormField
                value={formData.full_name}
                onChangeText={text => setFormData(prev => ({ ...prev, full_name: text }))}
                placeholder={t('profile.fullNamePlaceholder')}
              />
            </YStack>

            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">
                {t('profile.location')}
              </Text>
              <FormField
                value={formData.location}
                onChangeText={text => setFormData(prev => ({ ...prev, location: text }))}
                placeholder={t('profile.locationPlaceholder')}
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
              <Text color="$color">
                {LANGUAGE_LABELS[language]}
              </Text>
            </Button>

            <XStack
              justifyContent="space-between"
              alignItems="center"
              backgroundColor={formData.private_profile ? '$blue4' : undefined}
              padding="$4"
              borderRadius="$4"
              pressStyle={{
                scale: 0.98
              }}
              onPress={() =>
                setFormData(prev => ({ ...prev, private_profile: !prev.private_profile }))
              }
            >
              <Text size="lg" color="$color">
                {t('profile.privateProfile')}
              </Text>
              <Switch
                size="$6"
                checked={formData.private_profile}
                onCheckedChange={checked =>
                  setFormData(prev => ({ ...prev, private_profile: checked }))
                }
                backgroundColor={formData.private_profile ? '$blue8' : '$gray6'}
                scale={1.2}
                margin="$2"
                pressStyle={{
                  scale: 0.95
                }}
              >
                <Switch.Thumb
                  scale={1.2}
                  pressStyle={{
                    scale: 0.95
                  }}
                />
              </Switch>
            </XStack>

            <Button
              onPress={handleShowOnboarding}
              variant="secondary"
              size="lg"
            >
              <XStack gap="$2" alignItems="center">
                <Feather
                  name="help-circle"
                  size={20}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
                <Text>{t('profile.onboardingTour')}</Text>
              </XStack>
            </Button>

            <Button
              onPress={navigateToOnboardingDemo}
              variant="secondary"
              size="lg"
            >
              <XStack gap="$2" alignItems="center">
                <Feather
                  name="refresh-cw"
                  size={20}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
                <Text>{t('profile.contentUpdatesDemo')}</Text>
              </XStack>
            </Button>

            <Button
              onPress={navigateToTranslationDemo}
              variant="secondary"
              size="lg"
            >
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
                <Button variant="secondary" size="md" onPress={refreshTranslations} marginBottom="$2">
                  {t('profile.refreshTranslations')}
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
              {USER_ROLES.map(role => (
                <Button
                  key={role}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, role: role as UserRole }));
                    setShowRoleModal(false);
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
              {EXPERIENCE_LEVELS.map(level => (
                <Button
                  key={level}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, experience_level: level as ExperienceLevel }));
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
              {LANGUAGES.map(lang => (
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
