import { useState } from 'react';
import { YStack, Form, Input, Button, Select, Text } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database } from '../lib/database.types';
import { NavigationProp, useNavigation } from '@react-navigation/native';

type ExperienceLevel = Database['public']['Enums']['experience_level'];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

export function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    experience_level: profile?.experience_level || 'beginner' as ExperienceLevel,
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      await updateProfile(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

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
            
            <Input
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Location"
            />
            
            <Select
              value={formData.experience_level}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, experience_level: value as ExperienceLevel }))
              }
              items={EXPERIENCE_LEVELS.map(level => ({
                label: level.charAt(0).toUpperCase() + level.slice(1),
                value: level
              }))}
            />

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
              onPress={() => navigation.goBack()}
            >
              Go Back
            </Button>
          </YStack>
        </Form>
      </YStack>
    </SafeAreaView>
  );
} 