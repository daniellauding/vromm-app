import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { SectionHeader } from './SectionHeader';
import Svg, { Circle } from 'react-native-svg';
import { useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon: string | null;
  image: string | null;
  order_index: number;
  active: boolean;
  platform?: string;
  type?: string;
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
  created_at: string;
  updated_at: string;
}

interface ProgressCircleProps {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}

// ProgressCircle component
function ProgressCircle({
  percent,
  size = 40,
  color = '#00E6C3',
  bg = '#222',
}: ProgressCircleProps) {
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

interface ProgressSectionProps {
  activeUserId?: string | null;
}

export function ProgressSection({ activeUserId }: ProgressSectionProps) {
  const { language: lang, t } = useTranslation();
  const { profile, user: authUser } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [user, setUser] = useState<{ id: string } | null>(null);
  
  // Use activeStudentId from context, then activeUserId prop, then authenticated user
  const effectiveUserId = activeStudentId || activeUserId || authUser?.id || user?.id;

  // Debug logging for ProgressSection
  console.log('📊 [ProgressSection] Props activeUserId:', activeUserId);
  console.log('📊 [ProgressSection] StudentSwitch activeStudentId:', activeStudentId);
  console.log('📊 [ProgressSection] Auth user ID:', user?.id);
  console.log('📊 [ProgressSection] Effective user ID:', effectiveUserId);
  console.log('📊 [ProgressSection] Profile:', profile);
  console.log('📊 [ProgressSection] Is viewing student data?', !!activeStudentId);

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ProgressSection: Screen focused, refreshing data');
      if (effectiveUserId) {
        fetchCompletions();
      }
    }, [effectiveUserId]),
  );

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  useEffect(() => {
    // Fetch user from supabase auth
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Set up real-time subscription for exercise completions
  useEffect(() => {
    if (!effectiveUserId) return;

    console.log('ProgressSection: Setting up real-time subscription', effectiveUserId);

    // Fetch completions - extract as standalone function for reuse
    const fetchCompletions = async () => {
      try {
        const { data, error } = await supabase
          .from('learning_path_exercise_completions')
          .select('exercise_id')
          .eq('user_id', effectiveUserId);

        if (!error && data) {
          // Use a function updater to ensure we're working with the latest state
          console.log(`📊 [ProgressSection] Fetched ${data.length} completions for user:`, effectiveUserId);
          console.log(`📊 [ProgressSection] Completion data:`, data);
          setCompletedIds(data.map((c: { exercise_id: string }) => c.exercise_id));
        } else {
          console.log('📊 [ProgressSection] No completions or error for user:', effectiveUserId, error);
          setCompletedIds([]);
        }
      } catch (err) {
        console.error('Error fetching completions:', err);
        setCompletedIds([]);
      }
    };

    fetchCompletions();

    // Set up real-time subscription with a debounce mechanism
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Create a unique channel name that includes the component instance
    const channelName = `exercise-completions-home-${Date.now()}`;
    console.log(`ProgressSection: Creating channel ${channelName}`);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          // Log payload for debugging
          console.log('ProgressSection: Realtime update received:', payload.eventType);

          // Debounce to handle batch updates (like Mark All)
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('ProgressSection: Executing debounced fetch');
            fetchCompletions();
          }, 200); // Short delay to batch multiple rapid changes
        },
      )
      .subscribe((status) => {
        console.log(`ProgressSection: Subscription status: ${status}`);
      });

    // Clean up subscription and timer on unmount
    return () => {
      console.log(`ProgressSection: Cleaning up subscription ${channelName}`);
      clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  }, [effectiveUserId]);

  useEffect(() => {
    // Fetch all exercises for each path
    const fetchAllExercises = async () => {
      const map: { [pathId: string]: string[] } = {};
      for (const path of paths) {
        const { data } = await supabase
          .from('learning_path_exercises')
          .select('id')
          .eq('learning_path_id', path.id);
        map[path.id] = data ? data.map((e: { id: string }) => e.id) : [];
      }
      setExercisesByPath(map);
    };
    if (paths.length > 0) fetchAllExercises();
  }, [paths]);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);

          // Simple query to show all active learning paths 
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
    // Pass activeUserId so ProgressScreen knows which user's data to show
    console.log('📊 [ProgressSection] Navigating to ProgressTab with effectiveUserId:', effectiveUserId);
    navigation.navigate('ProgressTab', {
      selectedPathId: path.id,
      showDetail: true,
      activeUserId: effectiveUserId, // Pass the active user ID (includes StudentSwitch context)
    });
  };

  // Calculate progress for each path
  const getPathProgress = (pathId: string) => {
    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;
    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Make fetchCompletions available at component level
  const fetchCompletions = async () => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      if (!error && data) {
        console.log(`📊 [ProgressSection] Fetched ${data.length} completions for user:`, effectiveUserId);
        console.log(`📊 [ProgressSection] Completion data:`, data);
        setCompletedIds(data.map((c: { exercise_id: string }) => c.exercise_id));
      } else {
        console.log('📊 [ProgressSection] No completions or error for user:', effectiveUserId, error);
        setCompletedIds([]);
      }
    } catch (err) {
      console.error('Error fetching completions:', err);
      setCompletedIds([]);
    }
  };

  if (loading || paths.length === 0) {
    return null;
  }

  return (
    <YStack space="$4">
      <SectionHeader
        title={t('home.yourProgress') || 'Your Progress'}
        variant="chevron"
        onAction={() =>
          navigation.navigate('ProgressTab', { selectedPathId: paths[0]?.id, showDetail: true })
        }
        actionLabel={t('common.seeAll') || 'See All'}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$3" paddingHorizontal="$4">
          {paths.map((path, idx) => {
            const isActive = activePath === path.id;
            const percent = getPathProgress(path.id);
            // Allow all paths to be clickable - no order restriction
            const isEnabled = true;
            // Visual highlight for paths with progress
            const isNextToUnlock = percent > 0 && percent < 1;
            return (
              <TouchableOpacity
                key={path.id}
                onPress={() => isEnabled && handlePathPress(path)}
                activeOpacity={isEnabled ? 0.8 : 1}
                style={{
                  opacity: isEnabled ? 1 : 0.5,
                  borderWidth: isNextToUnlock ? 3 : 0,
                  borderColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                  borderRadius: 24,
                  shadowColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                  shadowOpacity: isNextToUnlock ? 0.5 : 0,
                  shadowRadius: isNextToUnlock ? 12 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  marginBottom: 8,
                }}
                disabled={!isEnabled}
              >
                <YStack
                  backgroundColor={isActive ? '$blue5' : '$backgroundStrong'}
                  padding={12}
                  borderRadius={20}
                  width={100}
                  height={120}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isActive ? '#00E6C3' : '#222',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <ProgressCircle
                      percent={percent}
                      size={40}
                      color="#fff"
                      bg={isActive ? '#00E6C3' : '#222'}
                    />
                    <Text
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 40,
                        height: 40,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        lineHeight: 40,
                        fontSize: 14,
                        fontWeight: 'bold',
                      }}
                      color={isActive ? '$color' : '$gray11'}
                    >
                      {Math.round(percent * 100)}%
                    </Text>
                  </View>
                  <Text
                    fontSize={14}
                    fontWeight={isActive ? 'bold' : '600'}
                    color={isActive ? '$color' : '$gray11'}
                    numberOfLines={2}
                    textAlign="center"
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
