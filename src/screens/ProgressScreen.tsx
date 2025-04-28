import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Define LearningPath type based on the learning_paths table
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

// For demo, English only. Replace with language context if needed.
const lang = 'en';

export function ProgressScreen() {
  const [activePath, setActivePath] = useState<string>('');
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'An error occurred while fetching learning paths');
    } finally {
      setLoading(false);
    }
  };

  const handlePathPress = (path: LearningPath) => {
    setActivePath(path.id);
    setDetailPath(path);
    setShowDetail(true);
  };

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#00E6C3" />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center" padding={24}>
        <Text color="$red10" textAlign="center">{error}</Text>
        <TouchableOpacity 
          onPress={fetchLearningPaths}
          style={{ marginTop: 16, padding: 12, backgroundColor: '#00E6C3', borderRadius: 8 }}
        >
          <Text color="$background">Retry</Text>
        </TouchableOpacity>
      </YStack>
    );
  }

  if (showDetail && detailPath) {
    return (
      <YStack flex={1} backgroundColor="$background" padding={24}>
        <TouchableOpacity onPress={() => setShowDetail(false)} style={{ marginBottom: 24 }}>
          <Feather name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text fontSize={28} fontWeight="bold" color="$color" marginBottom={8}>
          {detailPath.title[lang]}
        </Text>
        <Text color="$gray11" marginBottom={16}>
          {detailPath.description[lang]}
        </Text>
        {detailPath.icon && (
          <View style={{ marginTop: 16 }}>
            <Feather name={detailPath.icon as any} size={24} color="#00E6C3" />
          </View>
        )}
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {paths.map((path, idx) => {
          const isActive = activePath === path.id;
          const isFinished = paths.findIndex(p => p.id === path.id) < paths.findIndex(p => p.id === activePath);
          return (
            <TouchableOpacity
              key={path.id}
              onPress={() => handlePathPress(path)}
              activeOpacity={0.8}
              style={{ marginBottom: 20 }}
            >
              <Card
                backgroundColor={isActive ? "$blue5" : "$backgroundStrong"}
                padding={20}
                borderRadius={20}
                elevate
                style={{ opacity: isFinished ? 0.6 : 1 }}
              >
                <XStack alignItems="center" gap={16}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: isActive ? '#00E6C3' : '#222', alignItems: 'center', justifyContent: 'center' }}>
                    {isFinished ? (
                      <Feather name="check" size={32} color="#fff" />
                    ) : (
                      <View style={{ position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="circle" size={40} color={isActive ? '#fff' : '#444'} />
                        {isActive && (
                          <View style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: '#00E6C3', borderRightColor: 'transparent', transform: [{ rotate: '45deg' }] }} />
                        )}
                      </View>
                    )}
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={20} fontWeight={isActive ? 'bold' : '600'} color={isActive ? '$color' : '$gray11'}>
                      {idx + 1}. {path.title[lang]}
                    </Text>
                    <Text color="$gray11" fontSize={14} marginTop={2}>
                      {path.description[lang]}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </YStack>
  );
} 