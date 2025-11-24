import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, Text } from 'tamagui';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../contexts/TranslationContext';
import { SectionHeader } from '../../../components/SectionHeader';
import { ExerciseListSheet } from '../../../components/ExerciseListSheet';
import { LearningPathsSheet } from '../../../components/LearningPathsSheet';
import { useAuth } from '../../../context/AuthContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { LearningPath } from './LearningPath';
import { IncompleteFeaturedExercises } from './IncompleteFeaturedExercises';
import PayWall from './PayWall';
import PasswordModal from './PasswordModal';
import { FeaturedExercise, FeaturedLearningPath } from './types';
import { getFeaturedCardSizeConfig } from './variants';

export const FeaturedContent = React.memo(function FeaturedContent() {
  const { t, language: lang } = useTranslation();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallbackEn: string, fallbackSv: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    if (translated && translated !== key) {
      return translated;
    }
    return lang === 'sv' ? fallbackSv : fallbackEn;
  };
  const { user: authUser } = useAuth();
  const { loadUserPayments, loadUnlockedContent, isPathUnlocked, hasPathPayment } = useUnlock();

  const [featuredPaths, setFeaturedPaths] = useState<FeaturedLearningPath[]>([]);
  const [featuredExercises, setFeaturedExercises] = useState<FeaturedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const [virtualRepeatCompletions, setVirtualRepeatCompletions] = useState<string[]>([]);

  // Modal state for ExerciseListSheet and LearningPathsSheet
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [showLearningPathsSheet, setShowLearningPathsSheet] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | undefined>();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  // Paywall and Password Lock state
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<FeaturedLearningPath | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<FeaturedLearningPath | null>(null);

  // Load completion data
  const loadCompletionData = React.useCallback(async () => {
    if (!authUser?.id) return;

    try {
      // Fetch regular exercise completions
      const { data: regularData, error: regularError } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', authUser.id);

      // Fetch virtual repeat completions
      const { data: virtualData, error: virtualError } = await supabase
        .from('virtual_repeat_completions')
        .select('exercise_id, repeat_number')
        .eq('user_id', authUser.id);

      if (!regularError && regularData) {
        const completions = regularData.map((c: { exercise_id: string }) => c.exercise_id);
        setCompletedExerciseIds(completions);
      }

      if (!virtualError && virtualData) {
        const virtualCompletions = virtualData.map(
          (c: { exercise_id: string; repeat_number: number }) =>
            `${c.exercise_id}-virtual-${c.repeat_number}`,
        );
        setVirtualRepeatCompletions(virtualCompletions);
      }
    } catch (error) {
      console.error('Error loading completion data:', error);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchFeaturedContent();

    // Load user payment data on mount to ensure we have latest payment status
    if (authUser?.id) {
      loadUserPayments(authUser.id);
      loadUnlockedContent(authUser.id);
      loadCompletionData();
    }
  }, [authUser?.id, loadCompletionData, loadUserPayments, loadUnlockedContent]);

  // Real-time subscription for exercise completions - live updates
  useEffect(() => {
    if (!authUser?.id) return;

    // Subscribe to regular exercise completions
    const regularChannel = supabase
      .channel(`featured-regular-completions-${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          await loadCompletionData();
        },
      )
      .subscribe();

    // Subscribe to virtual repeat completions
    const virtualChannel = supabase
      .channel(`featured-virtual-completions-${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_repeat_completions',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          await loadCompletionData();
        },
      )
      .subscribe();

    return () => {
      regularChannel.unsubscribe();
      virtualChannel.unsubscribe();
    };
  }, [authUser?.id, loadCompletionData]);

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true);
      // Fetch featured learning paths
      const { data: pathsData, error: pathsError } = await supabase
        .from('learning_paths')
        .select(
          'id, title, description, icon, image, youtube_url, is_featured, is_locked, lock_password, paywall_enabled, price_usd, price_sek',
        )
        .eq('is_featured', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (pathsError) {
        console.error('Error fetching featured learning paths:', pathsError);
      } else {
        setFeaturedPaths(pathsData || []);
      }

      // Fetch featured exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('learning_path_exercises')
        .select(
          'id, title, description, icon, image, youtube_url, learning_path_id, is_featured, repeat_count, has_quiz, quiz_required, quiz_pass_score, show_quiz, show_exercise_content',
        )
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (exercisesError) {
        console.error('Error fetching featured exercises:', exercisesError);
        // If quiz columns don't exist yet, try without them
        if (exercisesError.code === '42703') {
          console.log('⚠️ [FeaturedContent] Quiz columns not found, fetching without them');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('learning_path_exercises')
            .select(
              'id, title, description, icon, image, youtube_url, learning_path_id, is_featured, repeat_count',
            )
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!fallbackError && fallbackData) {
            setFeaturedExercises(fallbackData || []);
          }
        }
      } else {
        setFeaturedExercises(exercisesData || []);
      }
    } catch (error) {
      console.error('Error fetching featured content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Completion check helper functions
  const isExerciseCompleted = React.useCallback(
    (exercise: FeaturedExercise): boolean => {
      // Check if the main exercise is completed
      const mainCompleted = completedExerciseIds.includes(exercise.id);

      // If no repeats, just check main completion
      if (!exercise.repeat_count || exercise.repeat_count <= 1) {
        return mainCompleted;
      }

      // If has repeats, check if all repeats are completed
      if (!mainCompleted) return false;

      for (let i = 2; i <= exercise.repeat_count; i++) {
        const virtualId = `${exercise.id}-virtual-${i}`;
        if (!virtualRepeatCompletions.includes(virtualId)) {
          return false;
        }
      }

      return true;
    },
    [completedExerciseIds, virtualRepeatCompletions],
  );

  const checkPathPaywall = React.useCallback(
    async (path: FeaturedLearningPath): Promise<boolean> => {
      if (!path.paywall_enabled) return true;

      // Double-check payment status before showing paywall
      if (authUser?.id) {
        await loadUserPayments(authUser.id);
      }

      if (hasPathPayment(path.id)) {
        console.log('✅ [FeaturedContent] User has already paid for this content:', path.id);
        return true;
      }

      console.log('🔒 [FeaturedContent] User needs to pay for content:', path.id);
      setPaywallPath(path);
      setShowPaywallModal(true);
      return false;
    },
    [authUser?.id, hasPathPayment, loadUserPayments],
  );

  const checkPathPassword = React.useCallback(
    async (path: FeaturedLearningPath): Promise<boolean> => {
      if (!path.is_locked) return true;
      if (isPathUnlocked(path.id)) {
        return true;
      }

      setPasswordPath(path);
      setShowPasswordModal(true);
      return false;
    },
    [isPathUnlocked],
  );

  const handleFeaturedPathPress = React.useCallback(
    async (path: FeaturedLearningPath) => {
      // Check paywall first
      const canAccessPaywall = await checkPathPaywall(path);
      if (!canAccessPaywall) {
        return; // Paywall modal will be shown
      }

      // Check password lock
      const canAccessPassword = await checkPathPassword(path);
      if (!canAccessPassword) {
        return; // Password modal will be shown
      }

      setSelectedPathId(path.id);
      setSelectedExerciseId(undefined); // No specific exercise, show path list
      setSelectedTitle(path.title[lang] || path.title.en);
      setShowExerciseSheet(true);
    },
    [checkPathPaywall, checkPathPassword, lang],
  );

  const handleFeaturedExercisePress = React.useCallback(
    async (exercise: FeaturedExercise) => {
      // Check paywall first
      const canAccessPaywall = await checkPathPaywall(exercise);
      if (!canAccessPaywall) {
        return; // Paywall modal will be shown
      }

      // Check password lock
      const canAccessPassword = await checkPathPassword(exercise);
      if (!canAccessPassword) {
        return; // Password modal will be shown
      }

      setSelectedPathId(exercise.learning_path_id);
      setSelectedExerciseId(exercise.id); // Set the specific exercise ID to auto-open it
      setSelectedTitle(exercise.title[lang] || exercise.title.en);
      setShowExerciseSheet(true);
    },
    [checkPathPaywall, checkPathPassword, lang],
  );

  // Filter out completed exercises
  const incompleteFeaturedExercises = React.useMemo(
    () => featuredExercises.filter((exercise) => !isExerciseCompleted(exercise)),
    [featuredExercises, isExerciseCompleted],
  );

  const hasContent = featuredPaths.length > 0 || incompleteFeaturedExercises.length > 0;

  // Calculate consistent height for all cards when equalHeight is enabled
  const equalCardHeight = React.useMemo(() => {
    const sizeConfig = getFeaturedCardSizeConfig('small');
    return sizeConfig.cardHeight || 220; // Default to 220 if not set
  }, []);

  if (loading) {
    return (
      <YStack marginBottom="$4">
        <SectionHeader
          title={getTranslation('home.featuredContent', 'Featured Learning', 'Utvalt innehåll')}
        />
        <YStack alignItems="center" justifyContent="center" padding="$4">
          <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
        </YStack>
      </YStack>
    );
  }

  if (!hasContent) {
    return null;
  }

  return (
    <YStack marginBottom="$6" gap="$4">
      <SectionHeader
        title={getTranslation('home.featuredContent', 'Featured Learning', 'Utvalt innehåll')}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 12,
          alignItems: 'stretch', // Ensure all items have same height
        }}
      >
        {/* Featured Learning Paths */}
        {featuredPaths.map((path) => (
          <LearningPath
            key={path.id}
            path={path}
            handleFeaturedPathPress={handleFeaturedPathPress}
            showIcon={false}
            showActionButton={false}
            showTitleIcon={true}
            equalHeight={true}
            cardHeight={equalCardHeight}
          />
        ))}

        {/* Featured Exercises (only incomplete ones) */}
        {incompleteFeaturedExercises.map((exercise) => (
          <IncompleteFeaturedExercises
            key={exercise.id}
            exercise={exercise}
            handleFeaturedExercisePress={handleFeaturedExercisePress}
            showIcon={false}
            showActionButton={false}
            showLockBadges={false}
            showTitleIcon={true}
            equalHeight={true}
            cardHeight={equalCardHeight}
          />
        ))}
      </ScrollView>

      <ExerciseListSheet
        visible={showExerciseSheet}
        onClose={() => {
          console.log('🎯 [FeaturedContent] ExerciseListSheet onClose called');
          setShowExerciseSheet(false);
          setSelectedExerciseId(undefined); // Clear the selected exercise
        }}
        title={selectedTitle}
        learningPathId={selectedPathId}
        initialExerciseId={selectedExerciseId}
        fromFeaturedContent={true}
      />

      <LearningPathsSheet
        visible={showLearningPathsSheet}
        onClose={() => {
          console.log('🎯 [FeaturedContent] LearningPathsSheet onClose called');
          setShowLearningPathsSheet(false);
        }}
        onPathSelected={(path) => {
          console.log('🎯 [FeaturedContent] Path selected from LearningPathsSheet:', path.title);
          setShowLearningPathsSheet(false);
          setSelectedPathId(path.id);
          setSelectedExerciseId(undefined);
          setSelectedTitle(path.title[lang] || path.title.en);
          setShowExerciseSheet(true);
        }}
        title={t('progressScreen.learningPaths') || 'Learning Paths'}
      />

      <PayWall
        visible={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        paywallPath={paywallPath}
        setSelectedPathId={setSelectedPathId}
        setSelectedTitle={setSelectedTitle}
        setShowExerciseSheet={setShowExerciseSheet}
      />

      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        passwordPath={passwordPath}
        setSelectedPathId={setSelectedPathId}
        setSelectedTitle={setSelectedTitle}
        setShowExerciseSheet={setShowExerciseSheet}
      />
    </YStack>
  );
});
