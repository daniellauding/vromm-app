import React from 'react';
import { useState } from 'react';
import { YStack } from 'tamagui';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Button } from '../../components/Button';

import { useTranslation } from '../../contexts/TranslationContext';
import { ProgressSection } from '../../components/ProgressSection';

import { SectionHeader } from '../../components/SectionHeader';
import { UsersList } from '../../components/UsersList';

import { WeeklyGoal } from './WeeklyGoal';
import { DailyStatus } from './DailyStatus';
import { JumpBackInSection } from '../../components/JumpBackInSection';
import { GettingStarted } from './GettingStarted';
import { FeaturedContent } from './FeaturedContent';
import { FeaturedContent2 } from './FeaturedContent2';
import { SavedRoutes } from './SavedRoutes';
// import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { CommunityFeed } from './CommunityFeed';

export default React.memo(function MyTab({
  activeUserId,
  handleRoutePress,
  setShowCommunityFeedSheet,
  setSelectedUserId,
  setShowUserProfileSheet,
  setShowUserListSheet,
}: {
  activeUserId: string | undefined;
  handleRoutePress: (routeId: string) => void;
  setShowCommunityFeedSheet: (show: boolean) => void;
  setSelectedUserId: (userId: string) => void;
  setShowUserProfileSheet: (show: boolean) => void;
  setShowUserListSheet: (show: boolean) => void;
}) {
  const { t } = useTranslation();
  const { getEffectiveUserId } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const effectiveUserId = activeUserId || getEffectiveUserId();
  const [selectedDailyStatusDate, setSelectedDailyStatusDate] = useState(new Date());

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

      {/* Jump Back In Section */}
      <JumpBackInSection activeUserId={effectiveUserId || undefined} />

      <GettingStarted />

      {/* Featured Content */}
      <FeaturedContent />

      {/* Featured Content 2 - Card Layout */}
      <FeaturedContent2 />

      <ProgressSection activeUserId={effectiveUserId} />
      <DraftRoutes onRoutePress={handleRoutePress} />
      <SavedRoutes onRoutePress={handleRoutePress} />
      <CommunityFeed
        onOpenFeedSheet={() => setShowCommunityFeedSheet(true)}
        onUserPress={onShowUser}
        onRoutePress={handleRoutePress}
      />
      {/* <QuickFilters handleFilterPress={handleFilterPress} /> */}
      <Button onPress={() => navigation.navigate('CreateRoute', {})} variant="primary" size="lg">
        {t('home.createNewRoute')}
      </Button>
      <YStack gap="$4">
        <CityRoutes onRoutePress={handleRoutePress} />
        <CreatedRoutes onRoutePress={handleRoutePress} />
        <NearByRoutes onRoutePress={handleRoutePress} />
        <DrivenRoutes onRoutePress={handleRoutePress} />
      </YStack>
      <YStack gap="$4" marginTop="$6" marginBottom="$6">
        <SectionHeader
          title="Users"
          variant="chevron"
          onAction={() => setShowUserListSheet(true)}
          actionLabel={t('common.seeAll')}
        />
        <UsersList onUserPress={onShowUser} />
      </YStack>
    </YStack>
  );
});
