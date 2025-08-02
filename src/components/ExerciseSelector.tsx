import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Dimensions,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { YStack, XStack, Card, Input, Separator, Avatar } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Chip } from './Chip';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';

// Learning Path Exercise interface (from ProgressScreen)
interface PathExercise {
  id: string;
  learning_path_id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  order_index: number;
  youtube_url?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  created_at?: string;
  updated_at?: string;
  language_specific_media?: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  bypass_order?: boolean;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  repeat_count?: number;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
}

// Learning Path interface
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  order_index: number;
  active: boolean;
}

// Extended Exercise type for routes
export interface RouteExercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  repetitions?: string;
  // Learning path exercise data
  learning_path_exercise_id?: string;
  learning_path_id?: string;
  learning_path_title?: string;
  youtube_url?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  has_quiz?: boolean;
  quiz_required?: boolean;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
  // Source indicator
  source: 'custom' | 'learning_path';
}

interface ExerciseSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedExercises: RouteExercise[];
  onExercisesChange: (exercises: RouteExercise[]) => void;
}

export function ExerciseSelector({
  visible,
  onClose,
  selectedExercises,
  onExercisesChange,
}: ExerciseSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { height: screenHeight } = Dimensions.get('window');

  // State
  const [loading, setLoading] = useState(false);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [showRepeats, setShowRepeats] = useState(true);
  const [sortBy, setSortBy] = useState<'order' | 'title' | 'path'>('order');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [previewExercise, setPreviewExercise] = useState<PathExercise | null>(null);

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadLearningPaths();
      loadAllExercises();
    }
  }, [visible]);

  const loadLearningPaths = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('id, title, description, icon, image, order_index, active')
        .eq('active', true)
        .order('order_index');

      if (error) throw error;
      setLearningPaths(data || []);
    } catch (error) {
      console.error('Error loading learning paths:', error);
      Alert.alert('Error', 'Failed to load learning paths');
    }
  };

  const loadAllExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('learning_path_exercises')
        .select(
          `
          *,
          learning_paths!inner(title, active)
        `,
        )
        .eq('learning_paths.active', true)
        .order('learning_path_id')
        .order('order_index');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort exercises
  const filteredExercises = useMemo(() => {
    const filtered = exercises.filter((exercise) => {
      // Path filter
      if (selectedPathId && exercise.learning_path_id !== selectedPathId) {
        return false;
      }

      // Repeat filter
      if (!showRepeats && exercise.isRepeat) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (exercise.title?.en || exercise.title?.sv || '').toLowerCase();
        const description = (
          exercise.description?.en ||
          exercise.description?.sv ||
          ''
        ).toLowerCase();
        const pathTitle =
          learningPaths.find((p) => p.id === exercise.learning_path_id)?.title?.en?.toLowerCase() ||
          '';

        return title.includes(query) || description.includes(query) || pathTitle.includes(query);
      }

      return true;
    });

    // Sort exercises
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title?.en || '').localeCompare(b.title?.en || '');
        case 'path':
          const pathA = learningPaths.find((p) => p.id === a.learning_path_id)?.title?.en || '';
          const pathB = learningPaths.find((p) => p.id === b.learning_path_id)?.title?.en || '';
          return pathA.localeCompare(pathB);
        case 'order':
        default:
          if (a.learning_path_id !== b.learning_path_id) {
            return a.learning_path_id.localeCompare(b.learning_path_id);
          }
          return a.order_index - b.order_index;
      }
    });

    return filtered;
  }, [exercises, selectedPathId, showRepeats, searchQuery, sortBy, learningPaths]);

  // Check if exercise is selected
  const isExerciseSelected = (exercise: PathExercise): boolean => {
    return selectedExercises.some((selected) => selected.learning_path_exercise_id === exercise.id);
  };

  // Toggle exercise selection
  const toggleExercise = (exercise: PathExercise) => {
    const pathInfo = learningPaths.find((p) => p.id === exercise.learning_path_id);

    if (isExerciseSelected(exercise)) {
      // Remove exercise
      const updated = selectedExercises.filter(
        (selected) => selected.learning_path_exercise_id !== exercise.id,
      );
      onExercisesChange(updated);
    } else {
      // Add exercise
      const routeExercise: RouteExercise = {
        id: `lpe_${exercise.id}`, // Prefix to avoid ID conflicts
        title: exercise.title?.en || exercise.title?.sv || 'Untitled',
        description: exercise.description?.en || exercise.description?.sv || '',
        learning_path_exercise_id: exercise.id,
        learning_path_id: exercise.learning_path_id,
        learning_path_title: pathInfo?.title?.en || pathInfo?.title?.sv || '',
        youtube_url: exercise.youtube_url,
        icon: exercise.icon,
        image: exercise.image,
        embed_code: exercise.embed_code,
        has_quiz: exercise.has_quiz,
        quiz_required: exercise.quiz_required,
        isRepeat: exercise.isRepeat,
        originalId: exercise.originalId,
        repeatNumber: exercise.repeatNumber,
        source: 'learning_path',
      };

      onExercisesChange([...selectedExercises, routeExercise]);
    }
  };

  // Clear all selections
  const clearSelections = () => {
    const customExercises = selectedExercises.filter((ex) => ex.source === 'custom');
    onExercisesChange(customExercises);
  };

  // Select all visible exercises
  const selectAllVisible = () => {
    const newSelections: RouteExercise[] = [];

    filteredExercises.forEach((exercise) => {
      if (!isExerciseSelected(exercise)) {
        const pathInfo = learningPaths.find((p) => p.id === exercise.learning_path_id);
        const routeExercise: RouteExercise = {
          id: `lpe_${exercise.id}`,
          title: exercise.title?.en || exercise.title?.sv || 'Untitled',
          description: exercise.description?.en || exercise.description?.sv || '',
          learning_path_exercise_id: exercise.id,
          learning_path_id: exercise.learning_path_id,
          learning_path_title: pathInfo?.title?.en || pathInfo?.title?.sv || '',
          youtube_url: exercise.youtube_url,
          icon: exercise.icon,
          image: exercise.image,
          embed_code: exercise.embed_code,
          has_quiz: exercise.has_quiz,
          quiz_required: exercise.quiz_required,
          isRepeat: exercise.isRepeat,
          originalId: exercise.originalId,
          repeatNumber: exercise.repeatNumber,
          source: 'learning_path',
        };
        newSelections.push(routeExercise);
      }
    });

    onExercisesChange([...selectedExercises, ...newSelections]);
  };

  // Get exercise stats
  const selectedCount = selectedExercises.filter((ex) => ex.source === 'learning_path').length;
  const totalCount = filteredExercises.length;

  // Render exercise item
  const renderExerciseItem = ({ item: exercise }: { item: PathExercise }) => {
    const isSelected = isExerciseSelected(exercise);
    const pathInfo = learningPaths.find((p) => p.id === exercise.learning_path_id);

    return (
      <Card
        key={exercise.id}
        bordered
        padding="$3"
        marginBottom="$2"
        backgroundColor={isSelected ? '$blue2' : '$background'}
        borderColor={isSelected ? '$blue8' : '$borderColor'}
      >
        <TouchableOpacity onPress={() => setPreviewExercise(exercise)}>
          <XStack gap="$3" alignItems="flex-start">
            {/* Selection indicator */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                toggleExercise(exercise);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                borderWidth: 2,
                borderColor: isSelected ? '#3B82F6' : '#666',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isSelected && <Feather name="check" size={14} color="white" />}
            </TouchableOpacity>

            {/* Exercise info */}
            <YStack flex={1} gap="$2">
              {/* Title and path */}
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" numberOfLines={2}>
                    {exercise.title?.en || exercise.title?.sv || 'Untitled'}
                    {exercise.isRepeat && ` (Repeat ${exercise.repeatNumber || ''})`}
                  </Text>
                  <Text fontSize={12} color="$blue10" numberOfLines={1}>
                    {pathInfo?.title?.en || pathInfo?.title?.sv || 'Unknown Path'}
                  </Text>
                </YStack>

                {/* Badges */}
                <XStack gap="$1">
                  {exercise.has_quiz && (
                    <View
                      style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text fontSize={10} color="white" fontWeight="500">
                        QUIZ
                      </Text>
                    </View>
                  )}
                  {exercise.youtube_url && (
                    <View
                      style={{
                        backgroundColor: '#EF4444',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text fontSize={10} color="white" fontWeight="500">
                        VIDEO
                      </Text>
                    </View>
                  )}
                  {exercise.isRepeat && (
                    <View
                      style={{
                        backgroundColor: '#F59E0B',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text fontSize={10} color="white" fontWeight="500">
                        REPEAT
                      </Text>
                    </View>
                  )}
                </XStack>
              </XStack>

              {/* Description */}
              {(exercise.description?.en || exercise.description?.sv) && (
                <Text fontSize={14} color="$gray11" numberOfLines={2}>
                  {exercise.description?.en || exercise.description?.sv}
                </Text>
              )}

              {/* Exercise metadata */}
              <XStack gap="$3" alignItems="center" justifyContent="space-between">
                <XStack gap="$3" alignItems="center">
                  <XStack gap="$1" alignItems="center">
                    <Feather name="hash" size={12} color="$gray9" />
                    <Text fontSize={12} color="$gray9">
                      Order: {exercise.order_index}
                    </Text>
                  </XStack>

                  {exercise.repeat_count && (
                    <XStack gap="$1" alignItems="center">
                      <Feather name="repeat" size={12} color="$gray9" />
                      <Text fontSize={12} color="$gray9">
                        {exercise.repeat_count}x
                      </Text>
                    </XStack>
                  )}
                </XStack>

                {/* Preview button */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setPreviewExercise(exercise);
                  }}
                  style={{
                    backgroundColor: '#3B82F6',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name="eye" size={12} color="white" />
                  <Text fontSize={11} color="white" fontWeight="500">
                    Preview
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </XStack>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={{
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: screenHeight * 0.85,
                paddingTop: 20,
              }}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#DDD',
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}
              />

              {/* Header */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingHorizontal={20}
                marginBottom={20}
              >
                <YStack>
                  <Text fontSize={20} fontWeight="bold">
                    Learning Path Exercises
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {selectedCount} of {totalCount} selected
                  </Text>
                </YStack>

                <XStack gap="$2">
                  <Button
                    onPress={clearSelections}
                    variant="secondary"
                    size="sm"
                    disabled={selectedCount === 0}
                  >
                    <Text fontSize={12}>Clear</Text>
                  </Button>
                  <Button onPress={onClose} variant="primary" size="sm">
                    <Text fontSize={12} color="white">
                      Done
                    </Text>
                  </Button>
                </XStack>
              </XStack>

              {/* Search and filters */}
              <YStack paddingHorizontal={20} gap="$3" marginBottom={20}>
                {/* Search */}
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  size="$4"
                  backgroundColor="$backgroundHover"
                />

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap="$2" paddingRight={20}>
                    {/* Learning path filter */}
                    <Chip active={selectedPathId === null} onPress={() => setSelectedPathId(null)}>
                      All Paths
                    </Chip>

                    {learningPaths.map((path) => (
                      <Chip
                        key={path.id}
                        active={selectedPathId === path.id}
                        onPress={() => setSelectedPathId(path.id)}
                      >
                        {path.title?.en || path.title?.sv || 'Untitled'}
                      </Chip>
                    ))}
                  </XStack>
                </ScrollView>

                {/* Options */}
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack gap="$3">
                    <TouchableOpacity
                      onPress={() => setShowRepeats(!showRepeats)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                          backgroundColor: showRepeats ? '#3B82F6' : 'transparent',
                          borderWidth: 2,
                          borderColor: '#3B82F6',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {showRepeats && <Feather name="check" size={10} color="white" />}
                      </View>
                      <Text fontSize={14}>Include Repeats</Text>
                    </TouchableOpacity>
                  </XStack>

                  <XStack gap="$2">
                    <Button
                      onPress={selectAllVisible}
                      variant="secondary"
                      size="sm"
                      disabled={filteredExercises.length === 0}
                    >
                      <XStack gap="$1" alignItems="center">
                        <Feather name="check-square" size={14} color="$blue10" />
                        <Text fontSize={12} color="$blue10">
                          Select All
                        </Text>
                      </XStack>
                    </Button>
                  </XStack>
                </XStack>
              </YStack>

              {/* Exercise list */}
              <FlatList
                data={filteredExercises}
                renderItem={renderExerciseItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={loadAllExercises}
                ListEmptyComponent={
                  <YStack alignItems="center" padding="$4">
                    <Feather name="search" size={48} color="$gray9" />
                    <Text fontSize={16} color="$gray11" textAlign="center" marginTop="$2">
                      {loading ? 'Loading exercises...' : 'No exercises found'}
                    </Text>
                    {searchQuery && (
                      <Text fontSize={14} color="$gray9" textAlign="center" marginTop="$1">
                        Try adjusting your search or filters
                      </Text>
                    )}
                  </YStack>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <Modal
          visible={!!previewExercise}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewExercise(null)}
        >
          <TouchableWithoutFeedback onPress={() => setPreviewExercise(null)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.7)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={{
                    backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    maxHeight: screenHeight * 0.8,
                    width: '100%',
                    maxWidth: 400,
                  }}
                >
                  {/* Preview Header */}
                  <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
                    <Text fontSize={18} fontWeight="bold">
                      Exercise Preview
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPreviewExercise(null)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#EF4444',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="x" size={16} color="white" />
                    </TouchableOpacity>
                  </XStack>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Preview Content - Similar to RouteExerciseViewer */}
                    <Card
                      bordered
                      padding="$3"
                      backgroundColor={isExerciseSelected(previewExercise) ? '$green1' : '$blue1'}
                      borderColor={isExerciseSelected(previewExercise) ? '$green8' : '$blue8'}
                    >
                      <YStack gap="$3">
                        {/* Exercise header */}
                        <XStack justifyContent="space-between" alignItems="flex-start">
                          <YStack flex={1} gap="$1">
                            <XStack alignItems="center" gap="$2">
                              <Text fontSize={16} fontWeight="600">
                                {previewExercise.title?.en ||
                                  previewExercise.title?.sv ||
                                  'Untitled'}
                                {previewExercise.isRepeat &&
                                  ` (Repeat ${previewExercise.repeatNumber || ''})`}
                              </Text>

                              {/* Status badges */}
                              <XStack gap="$1">
                                {isExerciseSelected(previewExercise) && (
                                  <View
                                    style={{
                                      backgroundColor: '#10B981',
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Text fontSize={10} color="white" fontWeight="500">
                                      SELECTED
                                    </Text>
                                  </View>
                                )}

                                <View
                                  style={{
                                    backgroundColor: '#3B82F6',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                  }}
                                >
                                  <Text fontSize={10} color="white" fontWeight="500">
                                    LEARNING PATH
                                  </Text>
                                </View>

                                {previewExercise.isRepeat && (
                                  <View
                                    style={{
                                      backgroundColor: '#F59E0B',
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Text fontSize={10} color="white" fontWeight="500">
                                      REPEAT {previewExercise.repeatNumber || ''}
                                    </Text>
                                  </View>
                                )}

                                {previewExercise.has_quiz && (
                                  <View
                                    style={{
                                      backgroundColor: '#8B5CF6',
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Text fontSize={10} color="white" fontWeight="500">
                                      QUIZ
                                    </Text>
                                  </View>
                                )}

                                {previewExercise.youtube_url && (
                                  <View
                                    style={{
                                      backgroundColor: '#EF4444',
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Text fontSize={10} color="white" fontWeight="500">
                                      VIDEO
                                    </Text>
                                  </View>
                                )}
                              </XStack>
                            </XStack>

                            <Text fontSize={12} color="$blue11">
                              From:{' '}
                              {learningPaths.find((p) => p.id === previewExercise.learning_path_id)
                                ?.title?.en || 'Unknown Path'}
                            </Text>
                          </YStack>
                        </XStack>

                        {/* Exercise description */}
                        {(previewExercise.description?.en || previewExercise.description?.sv) && (
                          <Text fontSize={14} color="$gray11">
                            {previewExercise.description?.en || previewExercise.description?.sv}
                          </Text>
                        )}

                        {/* Exercise metadata */}
                        <XStack gap="$3" alignItems="center" flexWrap="wrap">
                          <XStack gap="$1" alignItems="center">
                            <Feather name="hash" size={12} color="$gray9" />
                            <Text fontSize={12} color="$gray9">
                              Order: {previewExercise.order_index}
                            </Text>
                          </XStack>

                          {previewExercise.repeat_count && (
                            <XStack gap="$1" alignItems="center">
                              <Feather name="repeat" size={12} color="$gray9" />
                              <Text fontSize={12} color="$gray9">
                                {previewExercise.repeat_count}x
                              </Text>
                            </XStack>
                          )}

                          <XStack gap="$1" alignItems="center">
                            <Feather name="link" size={12} color="$gray9" />
                            <Text fontSize={12} color="$gray9">
                              Progress tracked
                            </Text>
                          </XStack>
                        </XStack>

                        {/* Video link if available */}
                        {previewExercise.youtube_url && (
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert('Video', 'YouTube video integration coming soon!');
                            }}
                            style={{
                              backgroundColor: '#EF4444',
                              padding: 8,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <Feather name="play" size={16} color="white" />
                            <Text fontSize={14} color="white" fontWeight="500">
                              Watch Exercise Video
                            </Text>
                          </TouchableOpacity>
                        )}
                      </YStack>
                    </Card>

                    {/* Preview Actions */}
                    <XStack gap="$3" marginTop={20}>
                      <Button
                        onPress={() => setPreviewExercise(null)}
                        variant="secondary"
                        size="lg"
                        flex={1}
                      >
                        <Text fontSize={14}>Close</Text>
                      </Button>

                      <Button
                        onPress={() => {
                          toggleExercise(previewExercise);
                          setPreviewExercise(null);
                        }}
                        variant="primary"
                        size="lg"
                        flex={1}
                        backgroundColor={isExerciseSelected(previewExercise) ? '$red10' : '$blue10'}
                      >
                        <XStack gap="$1" alignItems="center">
                          <Feather
                            name={isExerciseSelected(previewExercise) ? 'minus' : 'plus'}
                            size={16}
                            color="white"
                          />
                          <Text fontSize={14} color="white">
                            {isExerciseSelected(previewExercise) ? 'Remove' : 'Add to Route'}
                          </Text>
                        </XStack>
                      </Button>
                    </XStack>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </Modal>
  );
}
