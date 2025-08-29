import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
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
  learning_path_exercises: {
    id: string;
    learning_path_id: string;
    order_index: number;
    created_at: string;
    updated_at: string;
  }[];
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

const loadLastAudit = async (
  effectiveUserId: string | null,
): Promise<{ action: string; actor_name: string | null; created_at: string } | null> => {
  if (!effectiveUserId) return null;
  try {
    const { data, error } = await supabase
      .from('exercise_completion_audit')
      .select('action, actor_name, created_at')
      .eq('student_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
};

const fetchCompletions = async (effectiveUserId: string | null): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_path_exercise_completions')
      .select('exercise_id')
      .eq('user_id', effectiveUserId);

    if (!error && data) {
      return data.map((c: { exercise_id: string }) => c.exercise_id);
    } else {
      console.log('📊 [ProgressSection] No completions or error for user:', effectiveUserId, error);
      return [];
    }
  } catch (err) {
    console.error('Error fetching completions:', err);
    return [];
  }
};

const fetchLearningPaths = async (): Promise<LearningPath[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_paths')
      .select('* , learning_path_exercises(*)')
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (error) return [];
    return data || [];
  } catch (err) {
    console.error('Error fetching learning paths:', err);
    return [];
  }
};

export function ProgressSection({ activeUserId }: ProgressSectionProps) {
  const { language: lang, t } = useTranslation();
  const { user: authUser } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [lastAudit, setLastAudit] = useState<{
    action: string;
    actor_name: string | null;
    created_at: string;
  } | null>(null);

  // Use activeStudentId from context, then activeUserId prop, then authenticated user
  const effectiveUserId: string | null = activeStudentId || activeUserId || authUser?.id || null;

  // Fetch learning paths when the component mounts
  useEffect(() => {
    console.log('ProgressSection: Fetching learning paths');
    setLoading(true);
    const fetch = async () => {
      const data = await fetchLearningPaths();
      if (data && data.length > 0) {
        setPaths(data);
        setActivePath(data[0].id);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ProgressSection: Screen focused, refreshing data');
      if (effectiveUserId) {
        fetchCompletions(effectiveUserId);
      }
    }, [effectiveUserId]),
  );

  useEffect(() => {
    const fetch = async () => {
      const [lastAudit, completions] = await Promise.all([
        loadLastAudit(effectiveUserId),
        fetchCompletions(effectiveUserId),
      ]);

      setLastAudit(lastAudit);
      setCompletedIds(completions);
    };
    fetch();

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
            fetchCompletions(effectiveUserId);
          }, 200); // Short delay to batch multiple rapid changes
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_repeat_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('ProgressSection: Executing debounced fetch (virtual repeats)');
            fetchCompletions(effectiveUserId);
          }, 200);
        },
      );

    // Clean up subscription and timer on unmount
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  }, [effectiveUserId]);

  const handlePathPress = React.useCallback(
    (path: LearningPath) => {
      setActivePath(path.id);
      // Navigate to ProgressTab with the specific path details and showDetail flag
      // Pass activeUserId so ProgressScreen knows which user's data to show
      console.log(
        '📊 [ProgressSection] Navigating to ProgressTab with effectiveUserId:',
        effectiveUserId,
      );
      navigation.navigate('ProgressTab', {
        selectedPathId: path.id,
        showDetail: true,
        activeUserId: effectiveUserId || undefined, // Pass the active user ID (includes StudentSwitch context)
      });
    },
    [effectiveUserId, navigation],
  );

  // Calculate progress for each path
  const getPathProgress = (path: LearningPath) => {
    const ids = path.learning_path_exercises.map((exercise) => exercise.id);
    if (ids.length === 0) return 0;
    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
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
          navigation.navigate('ProgressTab', {
            activeUserId: effectiveUserId || undefined,
          })
        }
        actionLabel={t('common.seeAll') || 'See All'}
      />
      {lastAudit && (
        <YStack paddingHorizontal="$4" marginBottom={4}>
          <Text color="$gray11" fontSize={12}>
            Last: {lastAudit.action.replace('_', ' ')} by {lastAudit.actor_name || 'Unknown'} at{' '}
            {new Date(lastAudit.created_at).toLocaleString()}
          </Text>
        </YStack>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$3" paddingHorizontal="$4">
          {paths.map((path) => {
            const isActive = activePath === path.id;
            const percent = getPathProgress(path);
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
                      backgroundColor: isActive ? '#00E6C3' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <ProgressCircle
                      percent={percent}
                      size={40}
                      color={isActive ? '#fff' : '#00E6C3'}
                      bg={isActive ? '#00E6C3' : '#E5E5E5'}
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
                        fontSize: 10,
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
