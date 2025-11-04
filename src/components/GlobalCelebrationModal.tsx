import React from 'react';
import { CelebrationModal } from './CelebrationModal';
import { useCelebration } from '../contexts/CelebrationContext';

export function GlobalCelebrationModal() {
  const { isVisible, data, hideCelebration } = useCelebration();

  console.log('🎊 [GlobalCelebrationModal] Render check:', { isVisible, hasData: !!data });

  if (!isVisible || !data) return null;

  console.log('🎊 [GlobalCelebrationModal] RENDERING CELEBRATION MODAL!');

  return (
    <CelebrationModal
      visible={isVisible}
      onClose={hideCelebration}
      learningPathTitle={data.learningPathTitle}
      completedExercises={data.completedExercises}
      totalExercises={data.totalExercises}
      timeSpent={data.timeSpent}
      streakDays={data.streakDays}
    />
  );
}
