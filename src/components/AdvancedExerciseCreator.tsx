import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  useColorScheme,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { YStack, XStack, Card, Input, TextArea, Separator } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Chip } from './Chip';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { Exercise } from '../types/route';
import * as mediaUtils from '../utils/mediaUtils';

interface AdvancedExerciseCreatorProps {
  visible: boolean;
  onClose: () => void;
  onExerciseCreated: (exercise: Exercise) => void;
  initialData?: Exercise; // Optional initial data for editing
}

interface ExerciseFormData {
  // Basic info
  title_en: string;
  title_sv: string;
  description_en: string;
  description_sv: string;
  duration: string;
  repetitions: string;

  // Rich content
  youtube_url: string;
  embed_code: string;

  // Quiz
  has_quiz: boolean;
  quiz_questions: {
    id: string;
    question_en: string;
    question_sv: string;
    options_en: string[];
    options_sv: string[];
    correct_answer: number;
    explanation_en: string;
    explanation_sv: string;
    // Media support for questions - separate for each language
    image_en?: string;
    image_sv?: string;
    youtube_url_en?: string;
    youtube_url_sv?: string;
    embed_code_en?: string;
    embed_code_sv?: string;
    // Backward compatibility
    image?: string;
    youtube_url?: string;
    embed_code?: string;
  }[];
  quiz_pass_score: number;
  quiz_max_attempts: number;

  // Organization
  visibility: 'private' | 'public' | 'unlisted';
  category: string;
  tags: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  vehicle_type: 'manual' | 'automatic' | 'both';

  // Advanced
  repeat_count: number;
  is_locked: boolean;
  lock_password: string;
}

const CATEGORIES = [
  'user-created',
  'driving-basics',
  'parking',
  'highway',
  'city-driving',
  'emergency',
  'vehicle-maintenance',
  'traffic-rules',
  'weather-conditions',
  'night-driving',
];

const COMMON_TAGS = [
  'beginner-friendly',
  'practice',
  'safety',
  'technique',
  'theory',
  'practical',
  'essential',
  'advanced',
  'quick-tip',
  'detailed',
];

export function AdvancedExerciseCreator({
  visible,
  onClose,
  onExerciseCreated,
  initialData,
}: AdvancedExerciseCreatorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const [formData, setFormData] = useState<ExerciseFormData>(() => {
    if (initialData) {
      console.log('🔍 [AdvancedExerciseCreator] EDIT MODE - Received initialData:', {
        id: initialData.id,
        title: initialData.title,
        description: initialData.description,
        has_quiz: initialData.has_quiz,
        quiz_data: initialData.quiz_data,
        quiz_data_type: typeof initialData.quiz_data,
        quiz_data_preview: initialData.quiz_data
          ? JSON.stringify(initialData.quiz_data).substring(0, 200) + '...'
          : null,
      });

      // Pre-populate form with existing exercise data
      const title =
        typeof initialData.title === 'string'
          ? { en: initialData.title, sv: initialData.title }
          : initialData.title;
      const description =
        typeof initialData.description === 'string'
          ? { en: initialData.description || '', sv: initialData.description || '' }
          : initialData.description || { en: '', sv: '' };

      console.log('🔍 [AdvancedExerciseCreator] EDIT MODE - Parsed title and description:', {
        original_title: initialData.title,
        parsed_title: title,
        original_description: initialData.description,
        parsed_description: description,
      });

      // Parse quiz data if it exists
      let quizQuestions: any[] = [];
      if (initialData.quiz_data && typeof initialData.quiz_data === 'object') {
        console.log(
          '🔍 [AdvancedExerciseCreator] EDIT MODE - Parsing quiz_data:',
          initialData.quiz_data,
        );

        const quizData = initialData.quiz_data as any;
        if (quizData.questions && Array.isArray(quizData.questions)) {
          console.log(
            '🔍 [AdvancedExerciseCreator] EDIT MODE - Found questions array:',
            quizData.questions.length,
          );

          quizQuestions = quizData.questions.map((q: any, index: number) => {
            console.log(`🔍 [AdvancedExerciseCreator] EDIT MODE - Processing question ${index}:`, {
              id: q.id,
              question: q.question,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              image: q.image,
              youtube_url: q.youtube_url,
              embed_code: q.embed_code,
            });

            return {
              id: q.id || Date.now().toString() + index,
              question_en: typeof q.question === 'string' ? q.question : q.question?.en || '',
              question_sv:
                typeof q.question === 'string'
                  ? q.question
                  : q.question?.sv || q.question?.en || '',
              options_en: Array.isArray(q.options) ? q.options : q.options?.en || [],
              options_sv: Array.isArray(q.options)
                ? q.options
                : q.options?.sv || q.options?.en || [],
              correct_answer: q.correct_answer || 0,
              explanation_en:
                typeof q.explanation === 'string' ? q.explanation : q.explanation?.en || '',
              explanation_sv:
                typeof q.explanation === 'string'
                  ? q.explanation
                  : q.explanation?.sv || q.explanation?.en || '',
              image: q.image || '',
              youtube_url: q.youtube_url || '',
              embed_code: q.embed_code || '',
            };
          });

          console.log(
            '🔍 [AdvancedExerciseCreator] EDIT MODE - Converted quiz questions:',
            quizQuestions,
          );
        }
      }

      const finalFormData = {
        title_en: title?.en || '',
        title_sv: title?.sv || title?.en || '',
        description_en: description?.en || '',
        description_sv: description?.sv || description?.en || '',
        duration: initialData.duration || '',
        repetitions: initialData.repetitions || '',
        youtube_url: initialData.youtube_url || '',
        embed_code: initialData.embed_code || '',
        has_quiz: initialData.has_quiz || false,
        quiz_questions: quizQuestions,
        quiz_pass_score: 70,
        quiz_max_attempts: 3,
        visibility: initialData.visibility || 'private',
        category: initialData.category || 'user-created',
        tags: initialData.tags || [],
        difficulty_level: initialData.difficulty_level || 'beginner',
        vehicle_type: initialData.vehicle_type || 'both',
        repeat_count: initialData.repeat_count || 1,
        is_locked: initialData.is_locked || false,
        lock_password: initialData.lock_password || '',
      };

      console.log('🔍 [AdvancedExerciseCreator] EDIT MODE - Final form data:', {
        title_en: finalFormData.title_en,
        title_sv: finalFormData.title_sv,
        description_en: finalFormData.description_en,
        description_sv: finalFormData.description_sv,
        has_quiz: finalFormData.has_quiz,
        quiz_questions_count: finalFormData.quiz_questions.length,
        quiz_questions: finalFormData.quiz_questions,
      });

      return finalFormData;
    }

    // Default form data when no initialData
    return {
      title_en: '',
      title_sv: '',
      description_en: '',
      description_sv: '',
      duration: '',
      repetitions: '',
      youtube_url: '',
      embed_code: '',
      has_quiz: false,
      quiz_questions: [],
      quiz_pass_score: 70,
      quiz_max_attempts: 3,
      visibility: 'private',
      category: 'user-created',
      tags: [],
      difficulty_level: 'beginner',
      vehicle_type: 'both',
      repeat_count: 1,
      is_locked: false,
      lock_password: '',
    };
  });

  const [media, setMedia] = useState<mediaUtils.MediaItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [tagInput, setTagInput] = useState('');

  // Handle initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && visible) {
      console.log('🔄 [AdvancedExerciseCreator] EDIT MODE - Updating form with initialData');

      // Parse the initialData and update form
      const title =
        typeof initialData.title === 'string'
          ? { en: initialData.title, sv: initialData.title }
          : initialData.title;
      const description =
        typeof initialData.description === 'string'
          ? { en: initialData.description || '', sv: initialData.description || '' }
          : initialData.description || { en: '', sv: '' };

      // Parse quiz data if it exists
      let quizQuestions: any[] = [];
      if (initialData.quiz_data && typeof initialData.quiz_data === 'object') {
        const quizData = initialData.quiz_data as any;
        if (quizData.questions && Array.isArray(quizData.questions)) {
          quizQuestions = quizData.questions.map((q: any, index: number) => ({
            id: q.id || Date.now().toString() + index,
            question_en: typeof q.question === 'string' ? q.question : q.question?.en || '',
            question_sv:
              typeof q.question === 'string' ? q.question : q.question?.sv || q.question?.en || '',
            options_en: Array.isArray(q.options) ? q.options : q.options?.en || [],
            options_sv: Array.isArray(q.options) ? q.options : q.options?.sv || q.options?.en || [],
            correct_answer: q.correct_answer || 0,
            explanation_en:
              typeof q.explanation === 'string' ? q.explanation : q.explanation?.en || '',
            explanation_sv:
              typeof q.explanation === 'string'
                ? q.explanation
                : q.explanation?.sv || q.explanation?.en || '',
            image: q.image || '',
            youtube_url: q.youtube_url || '',
            embed_code: q.embed_code || '',
          }));
        }
      }

      setFormData({
        title_en: title?.en || '',
        title_sv: title?.sv || title?.en || '',
        description_en: description?.en || '',
        description_sv: description?.sv || description?.en || '',
        duration: initialData.duration || '',
        repetitions: initialData.repetitions || '',
        youtube_url: initialData.youtube_url || '',
        embed_code: initialData.embed_code || '',
        has_quiz: initialData.has_quiz || false,
        quiz_questions: quizQuestions,
        quiz_pass_score: 70,
        quiz_max_attempts: 3,
        visibility: initialData.visibility || 'private',
        category: initialData.category || 'user-created',
        tags: initialData.tags || [],
        difficulty_level: initialData.difficulty_level || 'beginner',
        vehicle_type: initialData.vehicle_type || 'both',
        repeat_count: initialData.repeat_count || 1,
        is_locked: initialData.is_locked || false,
        lock_password: initialData.lock_password || '',
      });

      console.log(
        '✅ [AdvancedExerciseCreator] EDIT MODE - Form updated with quiz questions:',
        quizQuestions.length,
      );
    }
  }, [initialData, visible]);

  // Reset form when modal closes (for new exercises, not when editing)
  useEffect(() => {
    if (!visible && !initialData) {
      // Reset form to default state when modal closes and not editing
      setFormData({
        title_en: '',
        title_sv: '',
        description_en: '',
        description_sv: '',
        duration: '',
        repetitions: '',
        youtube_url: '',
        embed_code: '',
        has_quiz: false,
        quiz_questions: [],
        quiz_pass_score: 70,
        quiz_max_attempts: 3,
        visibility: 'private',
        category: 'user-created',
        tags: [],
        difficulty_level: 'beginner',
        vehicle_type: 'both',
        repeat_count: 1,
        is_locked: false,
        lock_password: '',
      });
      setMedia([]);
      setCurrentStep(0);
      setTagInput('');
    }
  }, [visible, initialData]);

  const steps = ['Basic Info', 'Rich Content', 'Quiz (Optional)', 'Organization', 'Settings'];

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleAddQuizQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      question_en: '',
      question_sv: '',
      options_en: ['', '', '', ''],
      options_sv: ['', '', '', ''],
      correct_answer: 0,
      explanation_en: '',
      explanation_sv: '',
      // Media fields
      image: '',
      youtube_url: '',
      embed_code: '',
    };

    setFormData((prev) => ({
      ...prev,
      quiz_questions: [...prev.quiz_questions, newQuestion],
    }));
  };

  const handleRemoveQuizQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      quiz_questions: prev.quiz_questions.filter((q) => q.id !== questionId),
    }));
  };

  const takePhoto = async () => {
    try {
      const newMedia = await mediaUtils.takePhoto();
      if (newMedia) {
        setMedia([...media, newMedia]);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadPhoto = async () => {
    try {
      const newMedia = await mediaUtils.pickMediaFromLibrary(false);
      if (newMedia && newMedia.length > 0) {
        setMedia([...media, ...newMedia]);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const recordVideo = async () => {
    try {
      const newMedia = await mediaUtils.recordVideo();
      if (newMedia) {
        setMedia([...media, newMedia]);
      }
    } catch (err) {
      console.error('Error recording video:', err);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  const uploadVideo = async () => {
    try {
      const newMedia = await mediaUtils.pickVideoFromLibrary(false);
      if (newMedia && newMedia.length > 0) {
        setMedia([...media, ...newMedia]);
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const validateAndCreateExercise = () => {
    console.log(`📝 [AdvancedExerciseCreator] ${initialData ? 'Updating' : 'Creating'} exercise:`, {
      title: formData.title_en,
      has_quiz: formData.has_quiz,
      quiz_questions: formData.quiz_questions.length,
      isEditing: !!initialData,
      formDataPreview: {
        title_en: formData.title_en,
        title_sv: formData.title_sv,
        has_quiz: formData.has_quiz,
        quiz_questions_preview: formData.quiz_questions.map((q) => ({
          id: q.id,
          question_en: q.question_en,
          question_sv: q.question_sv,
          options_en_count: q.options_en.length,
          options_sv_count: q.options_sv.length,
        })),
      },
    });

    // Validation
    if (!formData.title_en.trim()) {
      Alert.alert('Error', 'Please provide an English title');
      return;
    }

    if (!formData.description_en.trim()) {
      Alert.alert('Error', 'Please provide an English description');
      return;
    }

    if (formData.has_quiz && formData.quiz_questions.length === 0) {
      Alert.alert('Error', 'Please add at least one quiz question or disable quiz');
      return;
    }

    // Create exercise object
    const exercise: Exercise = {
      id: Date.now().toString(),
      title: formData.title_sv.trim()
        ? { en: formData.title_en, sv: formData.title_sv }
        : formData.title_en,
      description: formData.description_sv.trim()
        ? { en: formData.description_en, sv: formData.description_sv }
        : formData.description_en,
      duration: formData.duration,
      repetitions: formData.repetitions,
      source: 'custom',
      is_user_generated: true,
      visibility: formData.visibility,
      category: formData.category,
      difficulty_level: formData.difficulty_level,
      vehicle_type: formData.vehicle_type,
      creator_id: user?.id,
      created_at: new Date().toISOString(),
      promotion_status: 'none',
      quality_score: 0,
      rating: 0,
      rating_count: 0,
      completion_count: 0,
      report_count: 0,
      youtube_url: formData.youtube_url || undefined,
      embed_code: formData.embed_code || undefined,
      has_quiz: formData.has_quiz,
      quiz_required: formData.has_quiz,
      // Multilingual support
      title_translations: {
        en: formData.title_en,
        sv: formData.title_sv || formData.title_en,
      },
      description_translations: {
        en: formData.description_en,
        sv: formData.description_sv || formData.description_en,
      },
      // Media
      media_urls: media.map((m) => ({
        type: m.type as 'image' | 'video' | 'youtube',
        url: m.uri,
        description: m.description,
      })),
      // Quiz data
      quiz_data: formData.has_quiz
        ? {
            questions: formData.quiz_questions.map((q) => ({
              id: q.id,
              question: { en: q.question_en, sv: q.question_sv || q.question_en },
              options: {
                en: q.options_en,
                sv: q.options_sv.length ? q.options_sv : q.options_en,
              },
              correct_answer: q.correct_answer,
              explanation: {
                en: q.explanation_en,
                sv: q.explanation_sv || q.explanation_en,
              },
              // Include media fields
              image: q.image || undefined,
              youtube_url: q.youtube_url || undefined,
              embed_code: q.embed_code || undefined,
            })),
            pass_score: formData.quiz_pass_score,
            max_attempts: formData.quiz_max_attempts,
          }
        : undefined,
      // Tags and categorization
      tags: formData.tags,
      repeat_count: formData.repeat_count,
      is_locked: formData.is_locked,
      lock_password: formData.is_locked ? formData.lock_password : undefined,
    };

    console.log(`✅ [AdvancedExerciseCreator] Calling onExerciseCreated with exercise:`, {
      id: exercise.id,
      title: exercise.title,
      has_quiz: exercise.has_quiz,
      quiz_data_keys: exercise.quiz_data ? Object.keys(exercise.quiz_data) : [],
      quiz_questions_count: exercise.quiz_data?.questions?.length || 0,
    });

    onExerciseCreated(exercise);
  };

  const handleClose = () => {
    // For edit mode, we should be less aggressive about the unsaved changes warning
    // since the form is pre-filled with existing data
    if (initialData) {
      // In edit mode, just close without warning since user can always re-edit
      console.log('🔄 [AdvancedExerciseCreator] Closing edit mode');
      onClose();
      return;
    }

    // For new exercises, check if there's unsaved data
    const hasData =
      formData.title_en.trim() ||
      formData.description_en.trim() ||
      media.length > 0 ||
      formData.quiz_questions.length > 0;

    if (hasData) {
      Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to close?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  };

  const addYoutubeLink = () => {
    if (!formData.youtube_url) return;

    const newMedia = mediaUtils.createYoutubeMediaItem(formData.youtube_url);
    if (!newMedia) {
      Alert.alert('Error', 'Invalid YouTube URL');
      return;
    }
    setMedia([...media, newMedia]);
    setFormData((prev) => ({ ...prev, youtube_url: '' }));
  };

  const handleCreateExercise = () => {
    // Validation
    if (!formData.title_en.trim()) {
      Alert.alert('Error', 'Please provide at least an English title');
      return;
    }

    // Create exercise object
    const exercise: Exercise = {
      id: Date.now().toString(),
      title: formData.title_sv.trim()
        ? { en: formData.title_en, sv: formData.title_sv }
        : formData.title_en,
      description: formData.description_sv.trim()
        ? { en: formData.description_en, sv: formData.description_sv }
        : formData.description_en || undefined,
      duration: formData.duration || undefined,
      repetitions: formData.repetitions || undefined,
      youtube_url: formData.youtube_url || undefined,
      embed_code: formData.embed_code || undefined,

      // Quiz data
      has_quiz: formData.has_quiz,
      quiz_required: formData.has_quiz,
      quiz_pass_score: formData.quiz_pass_score,
      quiz_data:
        formData.has_quiz && formData.quiz_questions.length > 0
          ? {
              questions: formData.quiz_questions.map((q) => ({
                id: q.id,
                question: q.question_sv.trim()
                  ? { en: q.question_en, sv: q.question_sv }
                  : q.question_en,
                options: q.options_sv.some((opt) => opt.trim())
                  ? { en: q.options_en, sv: q.options_sv }
                  : q.options_en,
                correct_answer: q.correct_answer,
                explanation: q.explanation_sv.trim()
                  ? { en: q.explanation_en, sv: q.explanation_sv }
                  : q.explanation_en || undefined,
                // Include media fields
                image: q.image || undefined,
                youtube_url: q.youtube_url || undefined,
                embed_code: q.embed_code || undefined,
              })),
              pass_score: formData.quiz_pass_score,
              max_attempts: formData.quiz_max_attempts,
            }
          : undefined,

      // Organization
      source: 'custom',
      is_user_generated: true,
      visibility: formData.visibility,
      category: formData.category,
      tags: formData.tags,
      difficulty_level: formData.difficulty_level,
      vehicle_type: formData.vehicle_type,

      // Advanced features
      repeat_count: formData.repeat_count,
      is_locked: formData.is_locked,
      lock_password: formData.is_locked ? formData.lock_password : undefined,

      // Metadata
      creator_id: user?.id,
      created_at: new Date().toISOString(),
      promotion_status: 'none',
      quality_score: 0,
      rating: 0,
      rating_count: 0,
      completion_count: 0,
      report_count: 0,

      // Media
      custom_media_attachments: media.map((item) => ({
        type: item.type,
        url: item.uri,
        description: item.description,
        language: 'both' as const,
      })),
    };

    onExerciseCreated(exercise);
    onClose();

    // Reset form
    setFormData({
      title_en: '',
      title_sv: '',
      description_en: '',
      description_sv: '',
      duration: '',
      repetitions: '',
      youtube_url: '',
      embed_code: '',
      has_quiz: false,
      quiz_questions: [],
      quiz_pass_score: 70,
      quiz_max_attempts: 3,
      visibility: 'private',
      category: 'user-created',
      tags: [],
      difficulty_level: 'beginner',
      vehicle_type: 'both',
      repeat_count: 1,
      is_locked: false,
      lock_password: '',
    });
    setMedia([]);
    setCurrentStep(0);
  };

  const renderBasicInfo = () => (
    <YStack gap="$4">
      <Text fontSize={18} fontWeight="600">
        Basic Information
      </Text>

      <YStack gap="$2">
        <Text fontWeight="500">Title (English) *</Text>
        <Input
          value={formData.title_en}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, title_en: text }))}
          placeholder="Enter exercise title in English"
        />
      </YStack>

      <YStack gap="$2">
        <Text fontWeight="500">Title (Swedish)</Text>
        <Input
          value={formData.title_sv}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, title_sv: text }))}
          placeholder="Enter exercise title in Swedish (optional)"
        />
      </YStack>

      <YStack gap="$2">
        <Text fontWeight="500">Description (English)</Text>
        <TextArea
          value={formData.description_en}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description_en: text }))}
          placeholder="Describe what this exercise teaches"
          numberOfLines={4}
        />
      </YStack>

      <YStack gap="$2">
        <Text fontWeight="500">Description (Swedish)</Text>
        <TextArea
          value={formData.description_sv}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description_sv: text }))}
          placeholder="Swedish description (optional)"
          numberOfLines={4}
        />
      </YStack>

      <XStack gap="$3">
        <YStack flex={1} gap="$2">
          <Text fontWeight="500">Duration</Text>
          <Input
            value={formData.duration}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, duration: text }))}
            placeholder="e.g., 5 minutes"
          />
        </YStack>

        <YStack flex={1} gap="$2">
          <Text fontWeight="500">Repetitions</Text>
          <Input
            value={formData.repetitions}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, repetitions: text }))}
            placeholder="e.g., 3 times"
          />
        </YStack>
      </XStack>
    </YStack>
  );

  const renderRichContent = () => (
    <YStack gap="$4">
      <Text fontSize={18} fontWeight="600">
        Rich Content
      </Text>

      {/* Media Upload */}
      <YStack gap="$3">
        <Text fontWeight="500">Media</Text>
        <Text color="$gray11" fontSize="$3">
          Add photos and videos to enrich your exercise
        </Text>

        {/* Photo options */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="500">
            Photos
          </Text>
          <XStack gap="$2">
            <Button flex={1} onPress={takePhoto} variant="secondary">
              <XStack gap="$2" alignItems="center">
                <Feather name="camera" size={16} color="$blue10" />
                <Text color="$blue10">Take Photo</Text>
              </XStack>
            </Button>
            <Button flex={1} onPress={uploadPhoto} variant="secondary">
              <XStack gap="$2" alignItems="center">
                <Feather name="upload" size={16} color="$blue10" />
                <Text color="$blue10">Upload Photo</Text>
              </XStack>
            </Button>
          </XStack>
        </YStack>

        {/* Video options */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="500">
            Videos
          </Text>
          <XStack gap="$2">
            <Button flex={1} onPress={recordVideo} variant="secondary">
              <XStack gap="$2" alignItems="center">
                <Feather name="video" size={16} color="$blue10" />
                <Text color="$blue10">Record Video</Text>
              </XStack>
            </Button>
            <Button flex={1} onPress={uploadVideo} variant="secondary">
              <XStack gap="$2" alignItems="center">
                <Feather name="upload" size={16} color="$blue10" />
                <Text color="$blue10">Upload Video</Text>
              </XStack>
            </Button>
          </XStack>
        </YStack>

        {/* Media preview */}
        {media.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="500">
              Added Media ({media.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$2">
                {media.map((item, index) => (
                  <Card key={item.id} padding="$2" minWidth={80} position="relative">
                    <YStack alignItems="center" gap="$1">
                      <Feather
                        name={
                          item.type === 'image'
                            ? 'image'
                            : item.type === 'video'
                              ? 'video'
                              : 'youtube'
                        }
                        size={24}
                        color="$blue10"
                      />
                      <Text fontSize={10} textAlign="center" numberOfLines={1}>
                        {item.fileName || 'Media'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveMedia(index)}
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          backgroundColor: '#EF4444',
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="x" size={12} color="white" />
                      </TouchableOpacity>
                    </YStack>
                  </Card>
                ))}
              </XStack>
            </ScrollView>
          </YStack>
        )}
      </YStack>

      {/* YouTube */}
      <YStack gap="$2">
        <Text fontWeight="500">YouTube Video</Text>
        <XStack gap="$2">
          <Input
            flex={1}
            value={formData.youtube_url}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, youtube_url: text }))}
            placeholder="YouTube URL"
          />
          <Button onPress={addYoutubeLink} disabled={!formData.youtube_url}>
            <Feather name="plus" size={16} />
          </Button>
        </XStack>

        {/* YouTube Preview */}
        {formData.youtube_url && formData.youtube_url.includes('youtube') && (
          <Card padding="$2" backgroundColor="$backgroundSoft">
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <Feather name="youtube" size={16} color="$red10" />
                <Text fontSize="$2" color="$red10">
                  YouTube Video Preview
                </Text>
              </XStack>
              <View style={{ height: 150 }}>
                <WebView
                  source={{
                    uri: formData.youtube_url.includes('embed')
                      ? formData.youtube_url
                      : formData.youtube_url.replace('watch?v=', 'embed/'),
                  }}
                  style={{ flex: 1, borderRadius: 8 }}
                />
              </View>
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Embed Code */}
      <YStack gap="$2">
        <Text fontWeight="500">Embed Code</Text>
        <TextArea
          value={formData.embed_code}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, embed_code: text }))}
          placeholder="HTML embed code (optional)"
          numberOfLines={3}
        />
      </YStack>
    </YStack>
  );

  const renderOrganization = () => (
    <YStack gap="$4">
      <Text fontSize={18} fontWeight="600">
        Organization & Discovery
      </Text>

      {/* Visibility */}
      <YStack gap="$2">
        <Text fontWeight="500">Visibility</Text>
        <XStack gap="$2">
          {(['private', 'public', 'unlisted'] as const).map((visibility) => (
            <TouchableOpacity
              key={visibility}
              onPress={() => setFormData((prev) => ({ ...prev, visibility }))}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: formData.visibility === visibility ? '#3B82F6' : '#E5E7EB',
                backgroundColor: formData.visibility === visibility ? '#EBF4FF' : 'transparent',
              }}
            >
              <Text
                textAlign="center"
                color={formData.visibility === visibility ? '$blue10' : '$gray11'}
                fontWeight={formData.visibility === visibility ? '600' : '400'}
              >
                {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </XStack>
        <Text fontSize={12} color="$gray11">
          Private: Only you • Public: Discoverable by all • Unlisted: Shareable link only
        </Text>
      </YStack>

      {/* Category */}
      <YStack gap="$2">
        <Text fontWeight="500">Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setFormData((prev) => ({ ...prev, category }))}
              >
                <Chip text={category.replace('-', ' ')} selected={formData.category === category} />
              </TouchableOpacity>
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      {/* Tags */}
      <YStack gap="$2">
        <Text fontWeight="500">Tags</Text>
        <XStack gap="$2">
          <Input flex={1} value={tagInput} onChangeText={setTagInput} placeholder="Add a tag" />
          <Button onPress={handleAddTag} disabled={!tagInput.trim()}>
            <Feather name="plus" size={16} />
          </Button>
        </XStack>

        {/* Current Tags */}
        {formData.tags.length > 0 && (
          <XStack gap="$2" flexWrap="wrap">
            {formData.tags.map((tag) => (
              <TouchableOpacity key={tag} onPress={() => handleRemoveTag(tag)}>
                <Chip text={`${tag} ×`} selected={true} />
              </TouchableOpacity>
            ))}
          </XStack>
        )}

        {/* Suggested Tags */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            {COMMON_TAGS.filter((tag) => !formData.tags.includes(tag)).map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))}
              >
                <Chip text={tag} selected={false} />
              </TouchableOpacity>
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      {/* Difficulty & Vehicle Type */}
      <XStack gap="$3">
        <YStack flex={1} gap="$2">
          <Text fontWeight="500">Difficulty</Text>
          <XStack gap="$1">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setFormData((prev) => ({ ...prev, difficulty_level: level }))}
                style={{ flex: 1 }}
              >
                <Chip text={level} selected={formData.difficulty_level === level} />
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>

        <YStack flex={1} gap="$2">
          <Text fontWeight="500">Vehicle</Text>
          <XStack gap="$1">
            {(['manual', 'automatic', 'both'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setFormData((prev) => ({ ...prev, vehicle_type: type }))}
                style={{ flex: 1 }}
              >
                <Chip text={type} selected={formData.vehicle_type === type} />
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>
      </XStack>
    </YStack>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
        {/* Header */}
        <XStack
          padding="$4"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text fontSize={18} fontWeight="600">
            {initialData ? 'Edit Exercise' : 'Create Advanced Exercise'}
          </Text>
          <TouchableOpacity onPress={validateAndCreateExercise}>
            <Text color="$blue10" fontWeight="600">
              {initialData ? 'Update' : 'Create'}
            </Text>
          </TouchableOpacity>
        </XStack>

        {/* Step Progress */}
        <XStack padding="$4" gap="$2">
          {steps.map((step, index) => (
            <TouchableOpacity key={step} onPress={() => setCurrentStep(index)} style={{ flex: 1 }}>
              <YStack alignItems="center" gap="$1">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      index === currentStep
                        ? '#3B82F6'
                        : index < currentStep
                          ? '#10B981'
                          : '#E5E7EB',
                  }}
                />
                <Text
                  fontSize={10}
                  textAlign="center"
                  color={index === currentStep ? '$blue10' : '$gray11'}
                >
                  {step}
                </Text>
              </YStack>
            </TouchableOpacity>
          ))}
        </XStack>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {currentStep === 0 && renderBasicInfo()}
          {currentStep === 1 && renderRichContent()}
          {currentStep === 2 && (
            <YStack gap="$4">
              <Text fontSize={18} fontWeight="600">
                Quiz (Optional)
              </Text>

              {/* Enable Quiz Toggle */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                padding="$3"
                backgroundColor="$backgroundHover"
                borderRadius="$2"
              >
                <YStack flex={1}>
                  <Text fontWeight="500">Enable Quiz</Text>
                  <Text fontSize="$3" color="$gray11">
                    Add interactive questions to test knowledge
                  </Text>
                </YStack>
                <TouchableOpacity
                  onPress={() => setFormData((prev) => ({ ...prev, has_quiz: !prev.has_quiz }))}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: formData.has_quiz ? '#3B82F6' : '#E5E7EB',
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: 'white',
                      transform: [{ translateX: formData.has_quiz ? 22 : 2 }],
                    }}
                  />
                </TouchableOpacity>
              </XStack>

              {formData.has_quiz && (
                <YStack gap="$4">
                  {/* Quiz Settings */}
                  <Card padding="$3" backgroundColor="$backgroundSoft">
                    <YStack gap="$3">
                      <Text fontWeight="500">Quiz Settings</Text>

                      <XStack gap="$3">
                        <YStack flex={1} gap="$2">
                          <Text fontSize="$3">Pass Score (%)</Text>
                          <Input
                            value={formData.quiz_pass_score.toString()}
                            onChangeText={(text) => {
                              const score = parseInt(text) || 0;
                              setFormData((prev) => ({
                                ...prev,
                                quiz_pass_score: Math.min(100, Math.max(0, score)),
                              }));
                            }}
                            keyboardType="numeric"
                            placeholder="70"
                          />
                        </YStack>

                        <YStack flex={1} gap="$2">
                          <Text fontSize="$3">Max Attempts</Text>
                          <Input
                            value={formData.quiz_max_attempts.toString()}
                            onChangeText={(text) => {
                              const attempts = parseInt(text) || 1;
                              setFormData((prev) => ({
                                ...prev,
                                quiz_max_attempts: Math.max(1, attempts),
                              }));
                            }}
                            keyboardType="numeric"
                            placeholder="3"
                          />
                        </YStack>
                      </XStack>
                    </YStack>
                  </Card>

                  {/* Quiz Questions */}
                  <YStack gap="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontWeight="500">Questions ({formData.quiz_questions.length})</Text>
                      <Button onPress={handleAddQuizQuestion} variant="secondary" size="sm">
                        <XStack gap="$1" alignItems="center">
                          <Feather name="plus" size={16} color="$blue10" />
                          <Text color="$blue10">Add Question</Text>
                        </XStack>
                      </Button>
                    </XStack>

                    {formData.quiz_questions.map((question, questionIndex) => (
                      <Card
                        key={question.id}
                        padding="$3"
                        borderWidth={1}
                        borderColor="$borderColor"
                      >
                        <YStack gap="$3">
                          {/* Question Header */}
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text fontWeight="600">Question {questionIndex + 1}</Text>
                            <TouchableOpacity onPress={() => handleRemoveQuizQuestion(question.id)}>
                              <Feather name="trash-2" size={16} color="$red10" />
                            </TouchableOpacity>
                          </XStack>

                          {/* Question Text */}
                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Question (English) *
                            </Text>
                            <Input
                              value={question.question_en}
                              onChangeText={(text) => {
                                const updated = formData.quiz_questions.map((q) =>
                                  q.id === question.id ? { ...q, question_en: text } : q,
                                );
                                setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                              }}
                              placeholder="Enter your question..."
                            />
                          </YStack>

                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Question (Swedish)
                            </Text>
                            <Input
                              value={question.question_sv}
                              onChangeText={(text) => {
                                const updated = formData.quiz_questions.map((q) =>
                                  q.id === question.id ? { ...q, question_sv: text } : q,
                                );
                                setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                              }}
                              placeholder="Skriv din fråga... (optional)"
                            />
                          </YStack>

                          {/* Answer Options */}
                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Answer Options
                            </Text>
                            {question.options_en.map((option, optionIndex) => (
                              <XStack key={optionIndex} gap="$2" alignItems="center">
                                <TouchableOpacity
                                  onPress={() => {
                                    const updated = formData.quiz_questions.map((q) =>
                                      q.id === question.id
                                        ? { ...q, correct_answer: optionIndex }
                                        : q,
                                    );
                                    setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                  }}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    borderWidth: 2,
                                    borderColor:
                                      question.correct_answer === optionIndex
                                        ? '#3B82F6'
                                        : '#E5E7EB',
                                    backgroundColor:
                                      question.correct_answer === optionIndex
                                        ? '#3B82F6'
                                        : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {question.correct_answer === optionIndex && (
                                    <Feather name="check" size={12} color="white" />
                                  )}
                                </TouchableOpacity>

                                <Input
                                  flex={1}
                                  value={option}
                                  onChangeText={(text) => {
                                    const updated = formData.quiz_questions.map((q) => {
                                      if (q.id === question.id) {
                                        const newOptions = [...q.options_en];
                                        newOptions[optionIndex] = text;
                                        return { ...q, options_en: newOptions };
                                      }
                                      return q;
                                    });
                                    setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                  }}
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                              </XStack>
                            ))}
                          </YStack>

                          {/* Swedish Options */}
                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Swedish Options (Optional)
                            </Text>
                            {question.options_sv.map((option, optionIndex) => (
                              <Input
                                key={optionIndex}
                                value={option}
                                onChangeText={(text) => {
                                  const updated = formData.quiz_questions.map((q) => {
                                    if (q.id === question.id) {
                                      const newOptions = [...q.options_sv];
                                      newOptions[optionIndex] = text;
                                      return { ...q, options_sv: newOptions };
                                    }
                                    return q;
                                  });
                                  setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                }}
                                placeholder={`Alternativ ${optionIndex + 1}`}
                              />
                            ))}
                          </YStack>

                          {/* Question Media */}
                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Question Media (Optional)
                            </Text>

                            {/* Upload Media Buttons */}
                            <XStack gap="$2">
                              <Button
                                flex={1}
                                variant="secondary"
                                size="sm"
                                onPress={async () => {
                                  try {
                                    const newMedia = await mediaUtils.pickMediaFromLibrary(false);
                                    if (newMedia && newMedia.length > 0) {
                                      const updated = formData.quiz_questions.map((q) =>
                                        q.id === question.id ? { ...q, image: newMedia[0].uri } : q,
                                      );
                                      setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                    }
                                  } catch (err) {
                                    console.error('Error picking image:', err);
                                    Alert.alert('Error', 'Failed to pick image');
                                  }
                                }}
                              >
                                <XStack gap="$1" alignItems="center">
                                  <Feather name="image" size={14} color="$blue10" />
                                  <Text color="$blue10" fontSize="$2">
                                    Upload Image
                                  </Text>
                                </XStack>
                              </Button>

                              <Button
                                flex={1}
                                variant="secondary"
                                size="sm"
                                onPress={async () => {
                                  try {
                                    const newMedia = await mediaUtils.takePhoto();
                                    if (newMedia) {
                                      const updated = formData.quiz_questions.map((q) =>
                                        q.id === question.id ? { ...q, image: newMedia.uri } : q,
                                      );
                                      setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                    }
                                  } catch (err) {
                                    console.error('Error taking photo:', err);
                                    Alert.alert('Error', 'Failed to take photo');
                                  }
                                }}
                              >
                                <XStack gap="$1" alignItems="center">
                                  <Feather name="camera" size={14} color="$blue10" />
                                  <Text color="$blue10" fontSize="$2">
                                    Take Photo
                                  </Text>
                                </XStack>
                              </Button>
                            </XStack>

                            {/* Show uploaded image preview */}
                            {question.image && (
                              <Card padding="$2" backgroundColor="$backgroundSoft">
                                <YStack gap="$2">
                                  <XStack
                                    gap="$2"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <XStack gap="$2" alignItems="center">
                                      <Feather name="image" size={16} color="$green10" />
                                      <Text fontSize="$2" color="$green10">
                                        Image uploaded
                                      </Text>
                                    </XStack>
                                    <TouchableOpacity
                                      onPress={() => {
                                        const updated = formData.quiz_questions.map((q) =>
                                          q.id === question.id ? { ...q, image: '' } : q,
                                        );
                                        setFormData((prev) => ({
                                          ...prev,
                                          quiz_questions: updated,
                                        }));
                                      }}
                                    >
                                      <Feather name="x" size={16} color="$red10" />
                                    </TouchableOpacity>
                                  </XStack>
                                  {/* Image Preview */}
                                  <Image
                                    source={{ uri: question.image }}
                                    style={{
                                      width: '100%',
                                      height: 120,
                                      borderRadius: 8,
                                      resizeMode: 'cover',
                                    }}
                                  />
                                </YStack>
                              </Card>
                            )}

                            {/* Image URL (alternative input) */}
                            <YStack gap="$1">
                              <Text fontSize="$2" color="$gray11">
                                Or paste Image URL
                              </Text>
                              <Input
                                value={question.image || ''}
                                onChangeText={(text) => {
                                  const updated = formData.quiz_questions.map((q) =>
                                    q.id === question.id ? { ...q, image: text } : q,
                                  );
                                  setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                }}
                                placeholder="https://example.com/image.jpg"
                              />
                            </YStack>

                            {/* YouTube URL */}
                            <YStack gap="$1">
                              <Text fontSize="$2" color="$gray11">
                                YouTube URL
                              </Text>
                              <Input
                                value={question.youtube_url || ''}
                                onChangeText={(text) => {
                                  const updated = formData.quiz_questions.map((q) =>
                                    q.id === question.id ? { ...q, youtube_url: text } : q,
                                  );
                                  setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                }}
                                placeholder="https://youtube.com/watch?v=..."
                              />
                            </YStack>

                            {/* Embed Code */}
                            <YStack gap="$1">
                              <Text fontSize="$2" color="$gray11">
                                Embed Code
                              </Text>
                              <Input
                                value={question.embed_code || ''}
                                onChangeText={(text) => {
                                  const updated = formData.quiz_questions.map((q) =>
                                    q.id === question.id ? { ...q, embed_code: text } : q,
                                  );
                                  setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                                }}
                                placeholder="<iframe>...</iframe> or TypeForm embed"
                              />
                            </YStack>
                          </YStack>

                          {/* Explanation */}
                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Explanation (English) - Optional
                            </Text>
                            <TextArea
                              value={question.explanation_en}
                              onChangeText={(text) => {
                                const updated = formData.quiz_questions.map((q) =>
                                  q.id === question.id ? { ...q, explanation_en: text } : q,
                                );
                                setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                              }}
                              placeholder="Explain why this is the correct answer..."
                              numberOfLines={2}
                            />
                          </YStack>

                          <YStack gap="$2">
                            <Text fontSize="$3" fontWeight="500">
                              Explanation (Swedish) - Optional
                            </Text>
                            <TextArea
                              value={question.explanation_sv}
                              onChangeText={(text) => {
                                const updated = formData.quiz_questions.map((q) =>
                                  q.id === question.id ? { ...q, explanation_sv: text } : q,
                                );
                                setFormData((prev) => ({ ...prev, quiz_questions: updated }));
                              }}
                              placeholder="Förklara varför detta är rätt svar..."
                              numberOfLines={2}
                            />
                          </YStack>
                        </YStack>
                      </Card>
                    ))}

                    {formData.quiz_questions.length === 0 && (
                      <Card padding="$4" backgroundColor="$backgroundHover">
                        <YStack alignItems="center" gap="$2">
                          <Feather name="help-circle" size={32} color="$gray10" />
                          <Text textAlign="center" color="$gray11">
                            No questions added yet.{'\n'}Click "Add Question" to create your first
                            quiz question.
                          </Text>
                        </YStack>
                      </Card>
                    )}
                  </YStack>
                </YStack>
              )}
              <Text color="$gray11">Create interactive quizzes to test knowledge</Text>
              {/* Quiz creation UI would go here */}
            </YStack>
          )}
          {currentStep === 3 && renderOrganization()}
          {currentStep === 4 && (
            <YStack gap="$4">
              <Text fontSize={18} fontWeight="600">
                Advanced Settings
              </Text>
              {/* Advanced settings UI would go here */}
            </YStack>
          )}
        </ScrollView>

        {/* Navigation */}
        <XStack padding="$4" gap="$3" borderTopWidth={1} borderTopColor="$borderColor">
          <Button
            flex={1}
            variant="secondary"
            onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button
            flex={1}
            onPress={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </Button>
        </XStack>
      </View>
    </Modal>
  );
}
