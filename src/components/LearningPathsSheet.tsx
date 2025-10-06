import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useUnlock } from '../contexts/UnlockContext';
import { supabase } from '../lib/supabase';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { height } = Dimensions.get('window');

// Learning path interface (exact copy from ProgressScreen)
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
}

interface LearningPathsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPathSelected: (path: LearningPath) => void;
  title?: string;
}

// Progress Circle component (exact copy from ProgressScreen)
function ProgressCircle({
  percent,
  size = 56,
  color = '#00E6C3',
  bg = '#222',
}: {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}) {
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

export function LearningPathsSheet({ visible, onClose, onPathSelected, title = 'Learning Paths' }: LearningPathsSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { language: lang, t } = useTranslation();
  const {
    isPathUnlocked,
    hasPathPayment,
    loadUserPayments,
    loadUnlockedContent,
  } = useUnlock();
  const colorScheme = useColorScheme();

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // State
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Get effective user ID
  const effectiveUserId = activeStudentId || user?.id;

  // Load learning paths
  const loadLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: pathsData, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading learning paths:', error);
        return;
      }

      setPaths(pathsData || []);
      
      // Load exercises mapping for progress calculation
      const exerciseMap: { [pathId: string]: string[] } = {};
      if (pathsData) {
        for (const path of pathsData) {
          const { data: exerciseData } = await supabase
            .from('learning_path_exercises')
            .select('id')
            .eq('learning_path_id', path.id);
          exerciseMap[path.id] = exerciseData ? exerciseData.map((e: { id: string }) => e.id) : [];
        }
      }
      setExercisesByPath(exerciseMap);
    } catch (error) {
      console.error('Error loading learning paths:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load completed exercises
  const fetchCompletions = useCallback(async () => {
    if (!effectiveUserId) return;
    
    try {
      const { data: regularData, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      if (!error) {
        const completions = regularData?.map((c: { exercise_id: string }) => c.exercise_id) || [];
        setCompletedIds(completions);
      }
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  }, [effectiveUserId]);

  // Calculate path progress
  const getPathProgress = (pathId: string): number => {
    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;
    const completed = ids.filter(id => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Check if path is locked
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible && effectiveUserId) {
      loadLearningPaths();
      fetchCompletions();
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
    }
  }, [visible, effectiveUserId, loadLearningPaths, fetchCompletions, loadUserPayments, loadUnlockedContent]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLearningPaths(), fetchCompletions()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.9}
              maxHeight={height * 0.9}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="bold" color="$color">
                  {title}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                </TouchableOpacity>
              </XStack>

              {/* Learning Paths List */}
              <YStack flex={1}>
                {loading ? (
                  <YStack alignItems="center" justifyContent="center" flex={1}>
                    <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
                  </YStack>
                ) : paths.length === 0 ? (
                  <YStack alignItems="center" justifyContent="center" flex={1} gap="$2">
                    <Feather name="book-open" size={48} color="#666" />
                    <Text color="$gray11" textAlign="center">
                      {t('progressScreen.noLearningPaths') || 'No learning paths available'}
                    </Text>
                  </YStack>
                ) : (
                  <ScrollView 
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#00E6C3"
                        colors={['#00E6C3']}
                        progressBackgroundColor="#1a1a1a"
                      />
                    }
                  >
                    <YStack gap="$3">
                      {paths.map((path, index) => {
                        const progress = getPathProgress(path.id);
                        const isPasswordLocked = isPathPasswordLocked(path);
                        const isPaywallLocked = isPathPaywallLocked(path);
                        const isFirstPath = index === 0;

                        return (
                          <TouchableOpacity
                            key={`learning-path-${path.id}-${index}`}
                            onPress={() => {
                              console.log('🎯 [LearningPathsSheet] Path selected:', path.title[lang] || path.title.en);
                              onPathSelected(path);
                            }}
                            style={{
                              borderWidth: (isPasswordLocked || isPaywallLocked) ? 2 : 0,
                              borderColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
                              borderRadius: 20,
                              marginBottom: 12,
                            }}
                          >
                            <Card
                              backgroundColor={isPasswordLocked ? 'rgba(255, 147, 0, 0.1)' : '$backgroundStrong'}
                              padding="$4"
                              borderRadius={18}
                            >
                              <XStack alignItems="center" gap="$4">
                                {/* Progress Circle */}
                                <View
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 16,
                                    backgroundColor: isPasswordLocked ? '#FF9500' : '#222',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                  }}
                                >
                                  {isPasswordLocked ? (
                                    <MaterialIcons name="lock" size={30} color="#fff" />
                                  ) : (
                                    <>
                                      <ProgressCircle
                                        percent={progress}
                                        size={40}
                                        color="#fff"
                                        bg="#222"
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
                                          fontSize: 12,
                                          fontWeight: 'bold',
                                          color: '#fff',
                                        }}
                                      >
                                        {Math.round(progress * 100)}%
                                      </Text>
                                    </>
                                  )}
                                </View>

                                {/* Path Info */}
                                <YStack flex={1}>
                                  <XStack alignItems="center" gap="$2" marginBottom="$1">
                                    <Text
                                      fontSize="$5"
                                      fontWeight="bold"
                                      color={isPasswordLocked ? '#FF9500' : '$color'}
                                      numberOfLines={1}
                                      flex={1}
                                    >
                                      {index + 1}. {path.title[lang] || path.title.en}
                                    </Text>

                                    {/* Status badges */}
                                    {isPasswordLocked && (
                                      <XStack
                                        backgroundColor="#FF9500"
                                        paddingHorizontal="$2"
                                        paddingVertical="$1"
                                        borderRadius="$2"
                                        alignItems="center"
                                        gap="$1"
                                      >
                                        <MaterialIcons name="lock" size={12} color="white" />
                                        <Text fontSize="$1" color="white" fontWeight="bold">
                                          LOCKED
                                        </Text>
                                      </XStack>
                                    )}

                                    {isPaywallLocked && (
                                      <XStack
                                        backgroundColor="#00E6C3"
                                        paddingHorizontal="$2"
                                        paddingVertical="$1"
                                        borderRadius="$2"
                                        alignItems="center"
                                        gap="$1"
                                      >
                                        <Feather name="credit-card" size={12} color="black" />
                                        <Text fontSize="$1" color="black" fontWeight="bold">
                                          ${path.price_usd || 1.00}
                                        </Text>
                                      </XStack>
                                    )}
                                  </XStack>

                                  <Text color="$gray11" fontSize="$3" numberOfLines={2} marginBottom="$1">
                                    {path.description[lang] || path.description.en}
                                  </Text>

                                  {/* Exercise count */}
                                  <Text fontSize="$2" color="$gray11">
                                    {exercisesByPath[path.id]?.length || 0} exercises
                                  </Text>
                                </YStack>

                                {/* Arrow */}
                                <Feather name="chevron-right" size={20} color="$gray11" />
                              </XStack>
                            </Card>
                          </TouchableOpacity>
                        );
                      })}
                    </YStack>
                  </ScrollView>
                )}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
