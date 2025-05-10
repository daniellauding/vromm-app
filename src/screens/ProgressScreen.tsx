import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TabParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';

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

// Add Exercise type for learning_path_exercises
interface PathExercise {
  id: string;
  learning_path_id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  order_index: number;
  youtube_url?: string;
  icon?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  language_specific_media?: boolean;
  embed_code?: string;
}

// For demo, English only. Replace with language context if needed.
const lang = 'en';

// ProgressCircle component
interface ProgressCircleProps {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}
function ProgressCircle({ percent, size = 56, color = '#00E6C3', bg = '#222' }: ProgressCircleProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

export function ProgressScreen() {
  const route = useRoute<RouteProp<TabParamList, 'ProgressTab'>>();
  const { selectedPathId, showDetail } = route.params || {};

  const [activePath, setActivePath] = useState<string>(selectedPathId || '');
  const [showDetailView, setShowDetailView] = useState<boolean>(!!showDetail);
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PathExercise | null>(null);
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [pathProgress, setPathProgress] = useState<{ [pathId: string]: number }>({});

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  useEffect(() => {
    if (selectedPathId && paths.length > 0) {
      const path = paths.find(p => p.id === selectedPathId);
      if (path) {
        setDetailPath(path);
        setShowDetailView(!!showDetail);
      }
    }
  }, [selectedPathId, showDetail, paths]);

  useEffect(() => {
    if (showDetailView && detailPath) {
      // Fetch exercises for the selected learning path
      const fetchExercises = async () => {
        const { data, error } = await supabase
          .from('learning_path_exercises')
          .select('*')
          .eq('learning_path_id', detailPath.id)
          .order('order_index', { ascending: true });
        if (!error && data) {
          setExercises(data);
        } else {
          setExercises([]);
        }
      };
      fetchExercises();
    }
  }, [showDetailView, detailPath]);

  // Fetch completions for the current user
  useEffect(() => {
    const fetchCompletions = async () => {
      if (!user) return;
      setCompletionsLoading(true);
      const { data, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', user.id);
      if (!error && data) {
        setCompletedIds(data.map((c: any) => c.exercise_id));
      } else {
        setCompletedIds([]);
      }
      setCompletionsLoading(false);
    };
    fetchCompletions();
  }, [user, showDetailView, detailPath]);

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
      // Set the first path as active by default if no selectedPathId
      if (data && data.length > 0 && !selectedPathId) {
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
    setShowDetailView(true);
  };

  // Toggle completion for an exercise
  const toggleCompletion = async (exerciseId: string) => {
    if (!user) return;
    const isDone = completedIds.includes(exerciseId);
    if (isDone) {
      // Mark as not done
      await supabase
        .from('learning_path_exercise_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId);
      setCompletedIds(ids => ids.filter(id => id !== exerciseId));
    } else {
      // Mark as done
      await supabase
        .from('learning_path_exercise_completions')
        .insert([{ user_id: user.id, exercise_id: exerciseId }]);
      setCompletedIds(ids => [...ids, exerciseId]);
    }
  };

  // Calculate progress for each path from local state
  const getPathProgress = (pathId: string) => {
    // Only calculate for the currently loaded exercises if this is the active path
    if (activePath === pathId && exercises.length > 0) {
      const total = exercises.length;
      const completed = exercises.filter(ex => completedIds.includes(ex.id)).length;
      return total === 0 ? 0 : completed / total;
    }
    // For other paths, fallback to 0 (or you can cache if you want)
    return 0;
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

  if (selectedExercise) {
    const isDone = completedIds.includes(selectedExercise.id);
    return (
      <YStack flex={1} backgroundColor="$background" padding={24}>
        <TouchableOpacity onPress={() => setSelectedExercise(null)} style={{ marginBottom: 24 }}>
          <Feather name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text fontSize={28} fontWeight="bold" color="$color" marginBottom={8}>
          {selectedExercise.title?.[lang] || selectedExercise.title?.en || 'Untitled'}
        </Text>
        {selectedExercise.image && (
          <View style={{ marginBottom: 16 }}>
            <Text color="$gray11">Image: {selectedExercise.image}</Text>
          </View>
        )}
        {selectedExercise.icon && (
          <View style={{ marginBottom: 16 }}>
            <Feather name={selectedExercise.icon as any} size={24} color="#00E6C3" />
          </View>
        )}
        {selectedExercise.description?.[lang] && (
          <Text color="$gray11" marginBottom={8}>{selectedExercise.description[lang]}</Text>
        )}
        {selectedExercise.youtube_url && selectedExercise.youtube_url.length > 0 && (
          <Text color="$blue10" marginBottom={8}>YouTube: {selectedExercise.youtube_url}</Text>
        )}
        {/* Toggle done/not done button */}
        <TouchableOpacity
          onPress={() => toggleCompletion(selectedExercise.id)}
          style={{
            marginTop: 24,
            backgroundColor: isDone ? '#00E6C3' : '#222',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text color={isDone ? '$background' : '$color'} fontWeight="bold">
            {isDone ? 'Mark as Not Done' : 'Mark as Done'}
          </Text>
        </TouchableOpacity>
        {/* List all other available fields for transparency */}
        <YStack gap={8} marginTop={16}>
          <Text color="$gray11">ID: {selectedExercise.id}</Text>
          <Text color="$gray11">Order: {selectedExercise.order_index}</Text>
          <Text color="$gray11">Created: {selectedExercise.created_at}</Text>
          <Text color="$gray11">Updated: {selectedExercise.updated_at}</Text>
          <Text color="$gray11">Language-specific media: {String(selectedExercise.language_specific_media)}</Text>
          <Text color="$gray11">Embed code: {selectedExercise.embed_code || '-'}</Text>
        </YStack>
      </YStack>
    );
  }

  if (showDetailView && detailPath) {
    return (
      <YStack flex={1} backgroundColor="$background" padding={24}>
        <TouchableOpacity onPress={() => setShowDetailView(false)} style={{ marginBottom: 24 }}>
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
        {/* Exercises List */}
        <YStack marginTop={32} gap={16}>
          <Text fontSize={22} fontWeight="bold" color="$color" marginBottom={8}>
            Exercises
          </Text>
          {exercises.length === 0 ? (
            <Text color="$gray11">No exercises for this learning path.</Text>
          ) : (
            exercises.map((ex, idx) => {
              const isDone = completedIds.includes(ex.id);
              return (
                <TouchableOpacity key={ex.id} onPress={() => setSelectedExercise(ex)}>
                  <XStack alignItems="center" gap={12}>
                    <TouchableOpacity
                      onPress={e => {
                        e.stopPropagation();
                        toggleCompletion(ex.id);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isDone ? '#00E6C3' : '#888',
                        backgroundColor: isDone ? '#00E6C3' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      {isDone && <Feather name="check" size={20} color="#fff" />}
                    </TouchableOpacity>
                    <Card padding={16} borderRadius={16} backgroundColor="$backgroundStrong" flex={1}>
                      <Text fontSize={18} fontWeight="bold" color="$color">
                        {idx + 1}. {ex.title?.[lang] || ex.title?.en || 'Untitled'}
                      </Text>
                      {ex.description?.[lang] && (
                        <Text color="$gray11" marginTop={4}>{ex.description[lang]}</Text>
                      )}
                      {ex.youtube_url && ex.youtube_url.length > 0 && (
                        <Text color="$blue10" marginTop={4}>YouTube: {ex.youtube_url}</Text>
                      )}
                    </Card>
                  </XStack>
                </TouchableOpacity>
              );
            })
          )}
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {paths.map((path, idx) => {
          const isActive = activePath === path.id;
          const percent = getPathProgress(path.id);
          // Enable if first path, or previous path is 100% complete
          const isEnabled = idx === 0 || getPathProgress(paths[idx - 1]?.id) === 1;
          // Visual highlight for the next path that is now enabled
          const isNextToUnlock = isEnabled && idx > 0 && getPathProgress(paths[idx - 1]?.id) === 1 && getPathProgress(path.id) < 1;
          return (
            <TouchableOpacity
              key={path.id}
              onPress={() => isEnabled && handlePathPress(path)}
              activeOpacity={isEnabled ? 0.8 : 1}
              style={{
                marginBottom: 20,
                opacity: isEnabled ? 1 : 0.5,
                borderWidth: isNextToUnlock ? 3 : 0,
                borderColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                borderRadius: 24,
                shadowColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                shadowOpacity: isNextToUnlock ? 0.5 : 0,
                shadowRadius: isNextToUnlock ? 12 : 0,
                shadowOffset: { width: 0, height: 0 },
              }}
              disabled={!isEnabled}
            >
              <Card
                backgroundColor={isActive ? "$blue5" : "$backgroundStrong"}
                padding={20}
                borderRadius={20}
                elevate
              >
                <XStack alignItems="center" gap={16}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: isActive ? '#00E6C3' : '#222', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Progress circle with percent */}
                    <ProgressCircle percent={percent} size={40} color="#fff" bg={isActive ? '#00E6C3' : '#222'} />
                    <Text
                      style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, textAlign: 'center', textAlignVertical: 'center', lineHeight: 40 }}
                      color={isActive ? '$color' : '$gray11'}
                      fontWeight="bold"
                    >
                      {Math.round(percent * 100)}%
                    </Text>
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