import React from 'react';
import { useState } from 'react';
import { YStack } from 'tamagui';
import { useStudentSwitch } from '../../context/StudentSwitchContext';

import { useTranslation } from '../../contexts/TranslationContext';
import { ProgressSection } from '../../components/ProgressSection';
import { Text as RNText, View } from 'react-native';
import { useTabletLayout } from '../../hooks/useTabletLayout';

// import { SectionHeader } from '../../components/SectionHeader';
// import { UsersList } from '../../components/UsersList';

import { WeeklyGoal } from './WeeklyGoal';
import { DailyStatus } from './DailyStatus';
import { MapPreview } from './MapPreview';
// import { JumpBackInSection } from '../../components/JumpBackInSection';
import { GettingStarted } from './GettingStarted';
import { FeaturedContent } from './FeaturedContent';
import { PromotionalContent } from './PromotionalContent';
import { SavedRoutes } from './SavedRoutes';
// import { QuickFilters } from './QuickFilters';
// import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { DraftRoutes } from './DraftRoutes';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
import { PromotionSheet } from '../../components/PromotionSheet';
import { BetaTestingSheetModal } from '../../components/BetaTestingSheet';
import { useModal } from '../../contexts/ModalContext';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity, Linking, Share } from 'react-native';
import { useThemePreference } from '../../hooks/useThemeOverride';
// import { LearningPathCard } from './LearningPathCard';
// import { RoleSelectionCard } from './RoleSelectionCard';
// import { ConnectionsCard } from './ConnectionsCard';

export default React.memo(function MyTab({
  activeUserId,
  handleRoutePress,
  setSelectedUserId: _setSelectedUserId,
  setShowUserProfileSheet: _setShowUserProfileSheet,
  setShowUserListSheet: _setShowUserListSheet,
}: {
  activeUserId: string | undefined;
  handleRoutePress: (routeId: string) => void;
  setSelectedUserId: (userId: string) => void;
  setShowUserProfileSheet: (show: boolean) => void;
  setShowUserListSheet: (show: boolean) => void;
}) {
  const { t, language } = useTranslation();
  const { getEffectiveUserId } = useStudentSwitch();
  const { showModal } = useModal();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Tablet/iPad layout detection
  const { isTablet, horizontalPadding, cardGap } = useTabletLayout();
  const [selectedDailyStatusDate, setSelectedDailyStatusDate] = useState(new Date());
  const [showLearningPathsSheet, setShowLearningPathsSheet] = useState(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = useState<{
    id: string;
    title: { en: string; sv: string };
  } | null>(null);
  const [showPromotionSheet, setShowPromotionSheet] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<{
    id: string;
    title: { en: string; sv: string };
    body: { en: string; sv: string };
    icon: string | null;
    icon_color: string | null;
    image_url: string | null;
    youtube_embed: string | null;
    media_type: string | null;
    order_index: number;
  } | null>(null);

  // Track if promotional content has data
  const [hasPromotionalContent, setHasPromotionalContent] = useState(false);

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

  // Beta Testing Sheet handlers
  const handleOpenBetaTesting = React.useCallback(() => {
    showModal(
      <BetaTestingSheetModal
        onOpenBuyCoffee={() => {
          Linking.openURL('https://buymeacoffee.com/vromm');
        }}
        onOpenBetaWebView={() => {
          Linking.openURL('https://beta.vromm.se');
        }}
        onShareApp={async () => {
          try {
            await Share.share({
              message: 'Check out Vromm - The future of driving education! https://vromm.se',
              title: 'Share Vromm',
            });
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }}
        onOpenAbout={() => {
          Linking.openURL('https://vromm.se/about');
        }}
      />,
    );
  }, [showModal]);

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
      {/* Weekly Goal & Daily Status - Fluid width container */}
      <View style={{ paddingHorizontal: horizontalPadding }}>
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
      </View>

      {/* Map Preview - Sneak peek to the map screen */}
      <MapPreview />

      {/* 
        📱 RESPONSIVE GRID LAYOUT
        Mobile: 1 column (full width)
        Tablet Portrait/iPad: Special layout per section
        iPad Pro Landscape: Maintains special layout with adjustments
      */}

      {/* 
        NOTE: 
        The backgroundColor and padding props may not work on YStack if it is not a View underneath,
        or if the parent is not allowing it to be visible (e.g., parent style is transparent, or overflow: 'hidden'). 
        Try using backgroundColor, padding, and borderRadius as direct YStack props instead of style.
        See: https://tamagui.dev/docs/core/stack

        - Use 'backgroundColor=', 'padding=', 'borderRadius=' as props.  
        - Only use 'style' for properties Tamagui does not support as props.
      */}

      <YStack
        borderRadius={20}
        backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#EBEBEB'}
        paddingVertical={16}
        paddingHorizontal={4}
        paddingRight={0}
        marginTop={16}
      >
        {/* Getting Started - Always Full Width */}
        <View style={{ marginTop: 8 }}>
          <GettingStarted />
        </View>

        {/* Progress - Always Full Width */}
        <View style={{ marginTop: cardGap }}>
          <ProgressSection activeUserId={effectiveUserId} />
        </View>

        {/* Featured & Promo - Conditional width based on content availability */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            // paddingHorizontal: horizontalPadding,
            gap: cardGap,
            marginTop: cardGap,
          }}
        >
          {/* Featured Content - Takes full width if no promo, 50% if promo exists */}
          <View
            style={{
              width: isTablet ? (hasPromotionalContent ? '48%' : '100%') : '100%',
              minWidth: isTablet ? 300 : undefined,
            }}
          >
            <FeaturedContent />
          </View>

          {/* Promotional Content - Only rendered if has content */}
          {hasPromotionalContent && (
            <View
              style={{ width: isTablet ? '48%' : '100%', minWidth: isTablet ? 300 : undefined }}
            >
              <PromotionalContent
                onPromotionPress={(promotion) => {
                  setSelectedPromotion(promotion);
                  setShowPromotionSheet(true);
                }}
                onContentLoaded={(hasContent) => setHasPromotionalContent(hasContent)}
              />
            </View>
          )}
        </View>

        {/* Draft Routes - Full Width (separate from 4-col grid) */}
        <View style={{ marginTop: cardGap }}>
          <DraftRoutes onRoutePress={handleRoutePress} />
        </View>

        {/* Saved, Created, Driven Routes - 3 columns on tablet, 1 column on mobile */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            // paddingHorizontal: horizontalPadding,
            gap: cardGap,
            marginTop: cardGap,
          }}
        >
          {/* Saved Routes */}
          <View
            style={{
              flex: isTablet ? 1 : undefined,
              width: isTablet ? undefined : '100%',
              minWidth: isTablet ? 0 : undefined,
            }}
          >
            <SavedRoutes onRoutePress={handleRoutePress} />
          </View>

          {/* Created Routes */}
          <View
            style={{
              flex: isTablet ? 1 : undefined,
              width: isTablet ? undefined : '100%',
              minWidth: isTablet ? 0 : undefined,
            }}
          >
            <CreatedRoutes onRoutePress={handleRoutePress} />
          </View>

          {/* Driven Routes */}
          <View
            style={{
              flex: isTablet ? 1 : undefined,
              width: isTablet ? undefined : '100%',
              minWidth: isTablet ? 0 : undefined,
            }}
          >
            <DrivenRoutes onRoutePress={handleRoutePress} />
          </View>
        </View>

        {/* Nearby Routes - Separate full width section */}
        <View style={{ paddingHorizontal: horizontalPadding, marginTop: cardGap }}>
          <NearByRoutes onRoutePress={handleRoutePress} />
        </View>

        <View style={{ marginBottom: 40 }}>
          {/* Beta Testing Button */}
          <TouchableOpacity
            onPress={handleOpenBetaTesting}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              marginBottom: 8,
              padding: 16,
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather
                name="help-circle"
                size={20}
                color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
              />
              <RNText
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                }}
              >
                {getTranslation(
                  'home.betaTesting',
                  language === 'sv' ? 'Hjälp oss testa' : 'Help with testing',
                )}
              </RNText>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colorScheme === 'dark' ? '#8E8E93' : '#999'}
            />
          </TouchableOpacity>
        </View>
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
          title={language === 'sv' ? selectedLearningPath.title.sv : selectedLearningPath.title.en}
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

      {/* Promotion Sheet */}
      <PromotionSheet
        visible={showPromotionSheet}
        onClose={() => {
          setShowPromotionSheet(false);
          setSelectedPromotion(null);
        }}
        promotion={selectedPromotion}
        language={language}
      />
    </YStack>
  );
});
