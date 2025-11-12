import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CelebrationData {
  learningPathTitle: { en: string; sv: string };
  completedExercises: number;
  totalExercises: number;
  timeSpent?: number;
  streakDays?: number;
  isAllPathsComplete?: boolean; // 🏆 NEW: For "all paths complete" grand celebration
}

interface CelebrationContextType {
  showCelebration: (data: CelebrationData) => void;
  hideCelebration: () => void;
  isVisible: boolean;
  data: CelebrationData | null;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<CelebrationData | null>(null);

  const showCelebration = React.useCallback((celebrationData: CelebrationData) => {
    console.log('🎊 [CelebrationContext] showCelebration() called with data:', celebrationData);
    setData(celebrationData);
    setIsVisible(true);
    console.log('🎊 [CelebrationContext] isVisible set to TRUE');
  }, []);

  const hideCelebration = React.useCallback(() => {
    setIsVisible(false);
    setData(null);
  }, []);

  const value: CelebrationContextType = React.useMemo(
    () => ({
      showCelebration,
      hideCelebration,
      isVisible,
      data,
    }),
    [showCelebration, hideCelebration, isVisible, data],
  );

  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
