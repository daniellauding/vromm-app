import React from 'react';
import { useState } from 'react';
import { YStack } from 'tamagui';
import { useStudentSwitch } from '../../context/StudentSwitchContext';

import { useTranslation } from '../../contexts/TranslationContext';
import { ProgressSection } from '../../components/ProgressSection';

import { SectionHeader } from '../../components/SectionHeader';
// import { UsersList } from '../../components/UsersList';

import { WeeklyGoal } from './WeeklyGoal';
import { DailyStatus } from './DailyStatus';
// import { JumpBackInSection } from '../../components/JumpBackInSection';
import { GettingStarted } from './GettingStarted';
// import { FeaturedContent } from './FeaturedContent';
import { SavedRoutes } from './SavedRoutes';
// import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
// import { LearningPathCard } from './LearningPathCard';
// import { RoleSelectionCard } from './RoleSelectionCard';
// import { ConnectionsCard } from './ConnectionsCard';

export default React.memo(function MyTab({
  activeUserId,
  handleRoutePress,
  setSelectedUserId,
  setShowUserProfileSheet,
  setShowUserListSheet,
}: {
  activeUserId: string | undefined;
  handleRoutePress: (routeId: string) => void;
  setSelectedUserId: (userId: string) => void;
  setShowUserProfileSheet: (show: boolean) => void;
  setShowUserListSheet: (show: boolean) => void;
}) {
  const { t, language } = useTranslation();
  const { getEffectiveUserId } = useStudentSwitch();
  const effectiveUserId = activeUserId || getEffectiveUserId();
  const [selectedDailyStatusDate, setSelectedDailyStatusDate] = useState(new Date());
  const [showLearningPathsSheet, setShowLearningPathsSheet] = useState(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = useState<{
    id: string;
    title: { en: string; sv: string };
  } | null>(null);

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  const onDateSelected = React.useCallback(
    (date: Date) => {
      setSelectedDailyStatusDate(date);
    },
    [setSelectedDailyStatusDate],
  );

  const onShowUser = React.useCallback(
    (userId: string) => {
      if (userId) {
        setSelectedUserId(userId);
        setShowUserProfileSheet(true);
      }
    },
    [setSelectedUserId, setShowUserProfileSheet],
  );

  console.log('🗓️ [MyTab] Render');

  // Performance monitoring
  React.useEffect(() => {
    console.log('⚡ [MyTab] Mounted at:', new Date().toISOString());
    const startTime = Date.now();
    return () => {
      console.log('⚡ [MyTab] Unmounted after:', Date.now() - startTime, 'ms');
    };
  }, []);

  return (
    <YStack>
      {/* Weekly Goal Section */}
      <WeeklyGoal
        activeUserId={effectiveUserId || undefined}
        selectedDate={selectedDailyStatusDate}
        onDateSelected={onDateSelected}
      />
      <DailyStatus
        activeUserId={effectiveUserId || undefined}
        selectedDate={selectedDailyStatusDate}
        onDateChange={onDateSelected}
      />

      {/* Getting Started Section */}
      <GettingStarted />

      {/* Role Selection Card - COMMENTED OUT FOR PERFORMANCE TESTING */}
      {/* <RoleSelectionCard /> */}

      {/* Connections Card - COMMENTED OUT FOR PERFORMANCE TESTING */}
      {/* <ConnectionsCard /> */}

      {/* Learning Path Card - COMMENTED OUT FOR PERFORMANCE TESTING */}
      {/* <LearningPathCard
        activeUserId={effectiveUserId || undefined}
        onPress={(path) => {
          setSelectedLearningPath(path);
          setShowExerciseListSheet(true);
        }}
        onPressSeeAll={() => setShowLearningPathsSheet(true)}
      /> */}

      {/* Progress Section - RE-ENABLED FOR PERFORMANCE TESTING */}
      <ProgressSection activeUserId={effectiveUserId} />

      {/* Featured Content - COMMENTED OUT FOR PERFORMANCE TESTING */}
      {/* <FeaturedContent /> */}

      {/* Jump Back In Section - COMMENTED OUT FOR PERFORMANCE TESTING */}
      {/* <JumpBackInSection activeUserId={effectiveUserId || undefined} /> */}

      <DraftRoutes onRoutePress={handleRoutePress} />
      <SavedRoutes onRoutePress={handleRoutePress} />

      <YStack gap="$4">
        <CityRoutes onRoutePress={handleRoutePress} />
        <CreatedRoutes onRoutePress={handleRoutePress} />
        <DrivenRoutes onRoutePress={handleRoutePress} />
        <NearByRoutes onRoutePress={handleRoutePress} />
      </YStack>

      {/* Role Selection and Connections Cards */}
      {/* <YStack gap="$4" marginTop="$6">
        <RoleSelectionCard />
        <ConnectionsCard />
      </YStack> */}

      {/* <YStack gap="$4" marginTop="$6" marginBottom="$6">
        <SectionHeader
          title={getTranslation('home.users.title', language === 'sv' ? 'Användare' : 'Users')}
          variant="chevron"
          onAction={() => setShowUserListSheet(true)}
          actionLabel={t('common.seeAll')}
        />
        <UsersList onUserPress={onShowUser} />
      </YStack> */}

      {/* Exercise List Sheet for Selected Path */}
      {selectedLearningPath && (
        <ExerciseListSheet
          visible={showExerciseListSheet}
          onClose={() => {
            setShowExerciseListSheet(false);
            setSelectedLearningPath(null);
          }}
          onBackToAllPaths={() => {
            setShowExerciseListSheet(false);
            setShowLearningPathsSheet(true);
          }}
          title={`${t('exercises.learningExercises') || 'Learning Exercises'}: ${
            language === 'sv' ? selectedLearningPath.title.sv : selectedLearningPath.title.en
          }`}
          learningPathId={selectedLearningPath.id}
          showAllPaths={false}
        />
      )}

      {/* Learning Paths Sheet - Opens from "See All" */}
      <LearningPathsSheet
        visible={showLearningPathsSheet}
        onClose={() => setShowLearningPathsSheet(false)}
        onPathSelected={(path) => {
          console.log('Selected learning path:', path);
          setSelectedLearningPath(path);
          setShowLearningPathsSheet(false);
          setShowExerciseListSheet(true);
        }}
      />
    </YStack>
  );
});
