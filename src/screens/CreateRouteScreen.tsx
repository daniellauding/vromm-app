import { useState } from 'react';
import { YStack, Form, Input, Button, Select, Text, TextArea } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import { useNavigation } from '@react-navigation/native';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type SpotType = Database['public']['Enums']['spot_type'];
type SpotVisibility = Database['public']['Enums']['spot_visibility'];

const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
const SPOT_TYPES: SpotType[] = ['urban', 'rural', 'highway', 'residential'];
const VISIBILITY_OPTIONS: SpotVisibility[] = ['public', 'private', 'school_only'];

export function CreateRouteScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty: 'beginner' as DifficultyLevel,
    spot_type: 'urban' as SpotType,
    visibility: 'public' as SpotVisibility,
    transmission_type: 'manual',
    vehicle_types: ['car'],
    activity_level: 'moderate',
    best_season: 'all',
    best_times: 'morning',
  });

  const handleCreate = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { error: routeError } = await supabase
        .from('routes')
        .insert({
          ...formData,
          creator_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {},
          is_public: formData.visibility === 'public',
        });

      if (routeError) throw routeError;
      
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1} padding="$4" space="$4">
        <Text fontSize="$6" fontWeight="bold">Create New Route</Text>
        
        <Form onSubmit={handleCreate}>
          <YStack space="$4">
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Route Name"
            />
            
            <TextArea
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Description"
              numberOfLines={4}
            />
            
            <Select
              value={formData.difficulty}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, difficulty: value as DifficultyLevel }))
              }
              items={DIFFICULTY_LEVELS.map(level => ({
                label: level.charAt(0).toUpperCase() + level.slice(1),
                value: level
              }))}
            />

            <Select
              value={formData.spot_type}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, spot_type: value as SpotType }))
              }
              items={SPOT_TYPES.map(type => ({
                label: type.charAt(0).toUpperCase() + type.slice(1),
                value: type
              }))}
            />

            <Select
              value={formData.visibility}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, visibility: value as SpotVisibility }))
              }
              items={VISIBILITY_OPTIONS.map(option => ({
                label: option.charAt(0).toUpperCase() + option.slice(1),
                value: option
              }))}
            />

            {error ? (
              <Text color="$red10" fontSize="$3">{error}</Text>
            ) : null}

            <Button 
              themeInverse
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Route'}
            </Button>
          </YStack>
        </Form>
      </YStack>
    </SafeAreaView>
  );
} 