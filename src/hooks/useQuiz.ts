import { useState, useCallback } from 'react';

interface UseQuizOptions {
  exerciseId: string;
  exerciseTitle: { en: string; sv: string };
  hasQuiz: boolean;
  quizRequired: boolean;
  quizPassScore: number;
  onQuizComplete?: (passed: boolean, score: number) => void;
}

export function useQuiz({
  exerciseId,
  exerciseTitle,
  hasQuiz,
  quizRequired,
  quizPassScore,
  onQuizComplete,
}: UseQuizOptions) {
  const [showQuizModal, setShowQuizModal] = useState(false);

  const openQuiz = useCallback(() => {
    console.log('🎯 [useQuiz] openQuiz called with:', {
      hasQuiz,
      exerciseId,
      exerciseTitle,
      quizRequired,
      quizPassScore,
    });
    
    if (!hasQuiz) {
      console.log('❌ [useQuiz] Exercise does not have a quiz - hasQuiz is false!');
      return false;
    }
    
    console.log('✅ [useQuiz] Opening quiz modal...');
    setShowQuizModal(true);
    return true;
  }, [hasQuiz, exerciseId, exerciseTitle, quizRequired, quizPassScore]);

  const closeQuiz = useCallback(() => {
    setShowQuizModal(false);
  }, []);

  const handleQuizComplete = useCallback(
    (passed: boolean, score: number) => {
      console.log('Quiz completed:', { passed, score });
      onQuizComplete?.(passed, score);
    },
    [onQuizComplete],
  );

  return {
    showQuizModal,
    openQuiz,
    closeQuiz,
    handleQuizComplete,
    hasQuiz,
    quizRequired,
    quizPassScore,
    exerciseId,
    exerciseTitle,
  };
}

