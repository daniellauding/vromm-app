import { useState, useCallback } from 'react';
import { YStack, XStack, Switch, useTheme } from 'tamagui';
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

type ExperienceLevel = Database['public']['Enums']['experience_level'];
type UserRole = Database['public']['Enums']['user_role'];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const USER_ROLES: UserRole[] = ['student', 'instructor', 'school'];

export function ProfileScreen() {
  const { profile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const theme = useTheme();
  const colorScheme = useColorScheme();
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    role: profile?.role || 'student' as UserRole,
    experience_level: profile?.experience_level || 'beginner' as ExperienceLevel,
    private_profile: profile?.private_profile || false,
    location_lat: profile?.location_lat || null,
    location_lng: profile?.location_lng || null,
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
        longitude: location.coords.longitude,
      });

      const locationString = [
        address.street,
        address.city,
        address.region,
        address.country
      ].filter(Boolean).join(', ');

      setFormData(prev => ({
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

  return (
    <Screen scroll>
      <YStack f={1} gap={24}>
        <Header title="Profile" />
        <YStack gap={24}>
          <YStack gap={24}>
            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">Full Name</Text>
              <FormField
                value={formData.full_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
                placeholder="Enter your full name"
              />
            </YStack>

            <YStack>
              <Text size="lg" weight="medium" mb="$2" color="$color">Location</Text>
              <FormField
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="Enter your location"
                rightElement={
                  <Button
                    onPress={detectLocation}
                    disabled={loading}
                    variant="secondary"
                    padding="$2"
                    backgroundColor="transparent"
                    borderWidth={0}
                  >
                    <Feather name="map-pin" size={20} color={colorScheme === 'dark' ? 'white' : 'black'} />
                  </Button>
                }
              />
            </YStack>

            <Button
              onPress={() => setShowRoleModal(true)}
              variant="secondary"
              size="lg"
            >
              <Text color="$color">{formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</Text>
            </Button>

            <Button
              onPress={() => setShowExperienceModal(true)}
              variant="secondary"
              size="lg"
            >
              <Text color="$color">{formData.experience_level.charAt(0).toUpperCase() + formData.experience_level.slice(1)}</Text>
            </Button>

            <XStack 
              justifyContent="space-between"
              alignItems="center"
              backgroundColor={formData.private_profile ? "$blue4" : undefined}
              padding="$4"
              borderRadius="$4"
              pressStyle={{
                scale: 0.98,
              }}
              onPress={() => setFormData(prev => ({ ...prev, private_profile: !prev.private_profile }))}
            >
              <Text size="lg" color="$color">Private Profile</Text>
              <Switch
                size="$6"
                checked={formData.private_profile}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, private_profile: checked }))
                }
                backgroundColor={formData.private_profile ? "$blue8" : "$gray6"}
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
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>

            <Button
              onPress={handleSignOut}
              disabled={loading}
              variant="secondary"
              size="lg"
            >
              Sign Out
            </Button>
          </YStack>
        </YStack>
      </YStack>

      {/* Role Selection Modal */}
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
            <Text size="xl" weight="bold" color="$color">Select Role</Text>
            <YStack gap="$2">
              {USER_ROLES.map((role) => (
                <Button
                  key={role}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, role: role as UserRole }));
                    setShowRoleModal(false);
                  }}
                  variant={formData.role === role ? "primary" : "secondary"}
                  backgroundColor={formData.role === role ? "$blue10" : undefined}
                  size="lg"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </YStack>
            <Button 
              onPress={() => setShowRoleModal(false)}
              variant="secondary"
              size="lg"
              backgroundColor="$backgroundHover"
            >
              Close
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      {/* Experience Level Modal */}
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
            <Text size="xl" weight="bold" color="$color">Select Experience Level</Text>
            <YStack gap="$2">
              {EXPERIENCE_LEVELS.map((level) => (
                <Button
                  key={level}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, experience_level: level as ExperienceLevel }));
                    setShowExperienceModal(false);
                  }}
                  variant={formData.experience_level === level ? "primary" : "secondary"}
                  backgroundColor={formData.experience_level === level ? "$blue10" : undefined}
                  size="lg"
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </YStack>
            <Button 
              onPress={() => setShowExperienceModal(false)}
              variant="secondary"
              size="lg"
              backgroundColor="$backgroundHover"
            >
              Close
            </Button>
          </YStack>
        </Pressable>
      </Modal>
    </Screen>
  );
} 