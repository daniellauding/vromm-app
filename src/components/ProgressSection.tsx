import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { SectionHeader } from './SectionHeader';

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon: string | null;
  image: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const lang = 'en'; // For demo, English only. Replace with language context if needed.

export function ProgressSection() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setPaths(data || []);
      // Set the first path as active by default
      if (data && data.length > 0) {
        setActivePath(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching learning paths:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePathPress = (path: LearningPath) => {
    setActivePath(path.id);
    // Navigate to ProgressTab with the specific path details and showDetail flag
    navigation.navigate('ProgressTab', {
      selectedPathId: path.id,
      showDetail: true
    });
  };

  if (loading || paths.length === 0) {
    return null;
  }

  return (
    <YStack space="$4">
      <SectionHeader
        title="Your Progress"
        variant="chevron"
        onAction={() => navigation.navigate('ProgressTab')}
        actionLabel="See All"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$3" paddingHorizontal="$4">
          {paths.map((path, idx) => {
            const isActive = activePath === path.id;
            const isFinished = paths.findIndex(p => p.id === path.id) < paths.findIndex(p => p.id === activePath);
            
            return (
              <TouchableOpacity
                key={path.id}
                onPress={() => handlePathPress(path)}
                activeOpacity={0.8}
              >
                <YStack
                  backgroundColor={isActive ? "$blue5" : "$backgroundStrong"}
                  padding="$3"
                  borderRadius="$4"
                  width={100}
                  height={120}
                  justifyContent="space-between"
                  opacity={isFinished ? 0.6 : 1}
                >
                  <View style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 20, 
                    backgroundColor: isActive ? '#00E6C3' : '#222',
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {isFinished ? (
                      <Feather name="check" size={20} color="#fff" />
                    ) : (
                      <Text color={isActive ? '$color' : '$gray11'} size="lg" weight="bold">
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <Text 
                    size="sm" 
                    weight={isActive ? 'bold' : '600'} 
                    color={isActive ? '$color' : '$gray11'}
                    numberOfLines={2}
                  >
                    {path.title[lang]}
                  </Text>
                </YStack>
              </TouchableOpacity>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
} 