import { useState, useCallback } from 'react';
import { YStack, Form, Input, Button, Text, Switch, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database } from '../lib/database.types';
import * as Location from 'expo-location';
import { Alert, Modal, View } from 'react-native';

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
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1} padding="$4" space="$4">
        <Text fontSize="$6" fontWeight="bold">Profile</Text>
        
        <Form onSubmit={handleUpdate}>
          <YStack space="$4">
            <Input
              value={formData.full_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
              placeholder="Full Name"
            />
            
            <XStack space="$2" alignItems="center">
              <Input
                flex={1}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="Location"
              />
              <Button
                onPress={detectLocation}
                disabled={loading}
              >
                Detect
              </Button>
            </XStack>
            
            <YStack space="$2">
              <Text fontSize="$4" fontWeight="bold">Role</Text>
              <Button
                onPress={() => setShowRoleModal(true)}
                theme="alt1"
              >
                {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
              </Button>
            </YStack>

            <YStack space="$2">
              <Text fontSize="$4" fontWeight="bold">Experience Level</Text>
              <Button
                onPress={() => setShowExperienceModal(true)}
                theme="alt1"
              >
                {formData.experience_level.charAt(0).toUpperCase() + formData.experience_level.slice(1)}
              </Button>
            </YStack>

            <XStack space="$4" alignItems="center" backgroundColor="$gray3" padding="$4" borderRadius="$4">
              <Text fontSize="$4" fontWeight="bold">Private Profile</Text>
              <Switch
                backgroundColor="$gray5"
                size="$6"
                checked={formData.private_profile}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, private_profile: checked }))
                }
              >
                <Switch.Thumb />
              </Switch>
            </XStack>

            {error ? (
              <Text color="$red10" fontSize="$3">{error}</Text>
            ) : null}

            <Button 
              themeInverse
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>

            <Button 
              theme="red"
              onPress={handleSignOut}
              disabled={loading}
            >
              Sign Out
            </Button>
          </YStack>
        </Form>

        <Modal
          visible={showRoleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRoleModal(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <YStack
              backgroundColor="$background"
              padding="$4"
              margin="$4"
              borderRadius="$4"
              space="$2"
            >
              <Text fontSize="$5" fontWeight="bold">Select Role</Text>
              {USER_ROLES.map((role) => (
                <Button
                  key={role}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, role: role as UserRole }));
                    setShowRoleModal(false);
                  }}
                  theme={formData.role === role ? 'active' : undefined}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
              <Button onPress={() => setShowRoleModal(false)}>Cancel</Button>
            </YStack>
          </View>
        </Modal>

        <Modal
          visible={showExperienceModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExperienceModal(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <YStack
              backgroundColor="$background"
              padding="$4"
              margin="$4"
              borderRadius="$4"
              space="$2"
            >
              <Text fontSize="$5" fontWeight="bold">Select Experience Level</Text>
              {EXPERIENCE_LEVELS.map((level) => (
                <Button
                  key={level}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, experience_level: level as ExperienceLevel }));
                    setShowExperienceModal(false);
                  }}
                  theme={formData.experience_level === level ? 'active' : undefined}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
              <Button onPress={() => setShowExperienceModal(false)}>Cancel</Button>
            </YStack>
          </View>
        </Modal>
      </YStack>
    </SafeAreaView>
  );
} 