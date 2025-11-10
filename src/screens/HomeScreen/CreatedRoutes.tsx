import { HeroCarousel } from '@/src/components/HeroCarousel';
import { SectionHeader } from '@/src/components/SectionHeader';
import { RouteListSheet } from '@/src/components/RouteListSheet';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, Card } from 'tamagui';
import { FlatList, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { navigateDomain } from '@/src/utils/navigation';
import { supabase } from '../../lib/supabase';
import { EmptyState } from './EmptyState';
import { Text } from '../../components/Text';

// Import getting started images
const GETTING_STARTED_IMAGES = {
  firstRoute: require('../../../assets/images/getting_started/getting_started_02.png'),
};

interface CreatedRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const CreatedRoutes = ({ onRoutePress }: CreatedRoutesProps = {}) => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const [createdRoutes, setCreatedRoutes] = React.useState<Route[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);
  const colorScheme = useColorScheme();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  React.useEffect(() => {
    if (!effectiveUserId) return;

    const loadCreatedRoutes = async () => {
      console.log('🗺️ [CreatedRoutes] Loading created routes for user:', effectiveUserId);
      console.log('🗺️ [CreatedRoutes] Is viewing as student:', isViewingAsStudent);

      try {
        const { data: createdData, error: createdError } = await supabase
          .from('routes')
          .select('*')
          .eq('creator_id', effectiveUserId)
          .order('created_at', { ascending: false });

        if (createdError) throw createdError;

        console.log('🗺️ [CreatedRoutes] Loaded created routes:', createdData?.length || 0);
        setCreatedRoutes(createdData as Route[]);
      } catch (err) {
        console.error('❌ [CreatedRoutes] Error loading created routes:', err);
      }
    };
    loadCreatedRoutes();
  }, [effectiveUserId]);

  const onNavigateToRouteList = React.useCallback(() => {
    const titleText = isViewingAsStudent
      ? `${activeStudentName || 'Student'}'s Created Routes`
      : t('home.createdRoutes');
    console.log('[SHEET][HomeSection] CreatedRoutes → RouteListSheet with title:', titleText);
    setShowRouteListSheet(true);
  }, [isViewingAsStudent, activeStudentName, t]);

  // Helper function to get route image (same as SavedRoutes)
  const getRouteImage = (route: Route): string | null => {
    if (!route.media_attachments || !Array.isArray(route.media_attachments)) {
      return null;
    }

    for (const attachment of route.media_attachments) {
      if (
        attachment &&
        typeof attachment === 'object' &&
        'type' in attachment &&
        attachment.type === 'image' &&
        'url' in attachment &&
        typeof attachment.url === 'string'
      ) {
        return attachment.url;
      }
    }

    return null;
  };

  return (
    <>
      <YStack space="$4">
        <SectionHeader
          title={
            isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Created Routes`
              : t('home.createdRoutes')
          }
          variant="chevron"
          onAction={onNavigateToRouteList}
          actionLabel={t('common.seeAll')}
        />

        {createdRoutes.length === 0 ? (
          <YStack px="$4">
            <Card
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              overflow="hidden"
              borderWidth={1}
              borderColor="$borderColor"
            >
              {/* Image from Getting Started - Full width at top */}
              <Image
                source={GETTING_STARTED_IMAGES.firstRoute}
                style={{
                  width: '100%',
                  height: 140,
                  resizeMode: 'cover',
                }}
              />

              {/* Content below image */}
              <YStack alignItems="center" gap="$4" padding="$6">
                {/* Title and Message */}
                <YStack alignItems="center" gap="$2">
                  <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                    {isViewingAsStudent
                      ? language === 'sv'
                        ? 'Inga rutter skapade'
                        : 'No Routes Created'
                      : language === 'sv'
                        ? 'Skapa din första rutt'
                        : 'Create Your First Route'}
                  </Text>
                  <Text fontSize="$4" color="$gray11" textAlign="center">
                    {isViewingAsStudent
                      ? `${activeStudentName || (language === 'sv' ? 'Denna elev' : 'This student')} ${language === 'sv' ? 'har inte skapat några rutter än' : "hasn't created any routes yet"}`
                      : language === 'sv'
                        ? 'Dela dina favoritövningsplatser med communityn! Skapa detaljerade rutter med övningar och hjälp andra elever.'
                        : 'Share your favorite practice spots with the community! Create detailed routes with exercises and help other learners.'}
                  </Text>
                </YStack>

                {/* Action Buttons */}
                {!isViewingAsStudent && (
                  <YStack gap="$2" width="100%">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('CreateRoute')}
                      style={{
                        backgroundColor: '#00E6C3',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text fontSize="$4" fontWeight="600" color="#000">
                        {getTranslation(
                          'home.createdRoutes.createRoute',
                          language === 'sv' ? 'Skapa rutt' : 'Create Route'
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('MapTab')}
                      style={{
                        backgroundColor: 'transparent',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor:
                          colorScheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {getTranslation(
                          'home.createdRoutes.getInspired',
                          language === 'sv' ? 'Hämta inspiration' : 'Get Inspired'
                        )}
                      </Text>
                    </TouchableOpacity>
                  </YStack>
                )}
              </YStack>
            </Card>
          </YStack>
        ) : (
          <XStack paddingHorizontal="$4">
            <HeroCarousel
              title={t('home.createdRoutes')}
              items={createdRoutes}
              getImageUrl={getRouteImage}
              showTitle={false}
              showMapPreview={true}
              onItemPress={onRoutePress ? (route) => onRoutePress(route.id) : undefined}
            />
          </XStack>
        )}
      </YStack>

      {/* Route List Sheet */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => setShowRouteListSheet(false)}
        title={
          isViewingAsStudent
            ? `${activeStudentName || 'Student'}'s Created Routes`
            : t('home.createdRoutes')
        }
        routes={createdRoutes}
        type="created"
      />
    </>
  );
};
