import { SectionHeader } from '@/src/components/SectionHeader';
import { RouteListSheet } from '@/src/components/RouteListSheet';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, Card } from 'tamagui';
import { FlatList, Image, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Text } from '../../components/Text';
import { useModal } from '@/src/contexts/ModalContext';
import { CreateRouteSheet } from '@/src/components/CreateRouteSheet';
import { RouteCard } from '../../components/RouteCard';

// Import getting started images
const GETTING_STARTED_IMAGES = {
  firstRoute: require('../../../assets/images/getting_started/getting_started_02.png'),
};

interface CreatedRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

const DEVICE_WIDTH = Dimensions.get('window').width;

const RouteItem = ({
  route,
  onRoutePress,
}: {
  route: Route;
  onRoutePress?: (routeId: string) => void;
}) => {
  const navigation = useNavigation<NavigationProp>();
  const screenWidth = Dimensions.get('window').width;
  const padding = 32;
  const gap = 12;
  const cardWidth = (screenWidth - padding - gap * 2) / 3.5;
  return (
    <XStack marginRight="$3" width={cardWidth} overflow="hidden">
      <RouteCard
        route={route}
        preset="grid"
        onPress={() => {
          if (onRoutePress) {
            onRoutePress(route.id);
          } else {
            navigation.navigate('RouteDetail', { routeId: route.id });
          }
        }}
      />
    </XStack>
  );
};

export const CreatedRoutes = ({ onRoutePress }: CreatedRoutesProps = {}) => {
  const { t, language } = useTranslation();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const [createdRoutes, setCreatedRoutes] = React.useState<Route[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);
  const colorScheme = useColorScheme();
  const { showModal, hideModal } = useModal();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  const loadCreatedRoutes = React.useCallback(async () => {
    if (!effectiveUserId) return;

    const startTime = Date.now();
    console.log('⚡ [CreatedRoutes] Loading created routes for user:', effectiveUserId);
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
      console.log('⚡ [CreatedRoutes] Created routes loaded in:', Date.now() - startTime, 'ms');
    } catch (err) {
      console.error('❌ [CreatedRoutes] Error loading created routes:', err);
    }
  }, [effectiveUserId, isViewingAsStudent]);

  React.useEffect(() => {
    if (!effectiveUserId) return;

    loadCreatedRoutes();

    // Set up real-time subscription for route changes
    console.log('📡 [CreatedRoutes] Setting up real-time subscription for user:', effectiveUserId);
    const routesSubscription = supabase
      .channel(`created_routes_changes_${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'routes',
          filter: `creator_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log('📡 [CreatedRoutes] Route change detected:', payload.eventType);
          // Reload routes when any change occurs
          loadCreatedRoutes();
        },
      )
      .subscribe();

    return () => {
      console.log('📡 [CreatedRoutes] Cleaning up subscription');
      routesSubscription.unsubscribe();
    };
  }, [effectiveUserId, loadCreatedRoutes]);

  const onNavigateToRouteList = React.useCallback(() => {
    const titleText = isViewingAsStudent
      ? `${activeStudentName || 'Student'}'s Created Routes`
      : t('home.createdRoutes');
    console.log('[SHEET][HomeSection] CreatedRoutes → RouteListSheet with title:', titleText);
    setShowRouteListSheet(true);
  }, [isViewingAsStudent, activeStudentName, t]);

  return (
    <>
      <YStack space="$0">
        <SectionHeader
          title={
            isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Created Routes`
              : t('home.createdRoutes')
          }
          variant="chevron"
          onAction={onNavigateToRouteList}
          actionLabel={t('common.seeAll')}
          showActionLabel={false}
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
                      onPress={() => {
                        showModal(
                          <CreateRouteSheet
                            visible={true}
                            onClose={() => hideModal()}
                            onRouteCreated={(routeId) => {
                              console.log('✅ Route created with ID:', routeId);
                              hideModal();
                            }}
                          />,
                        );
                      }}
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
                          language === 'sv' ? 'Skapa rutt' : 'Create Route',
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
                          language === 'sv' ? 'Hämta inspiration' : 'Get Inspired',
                        )}
                      </Text>
                    </TouchableOpacity>
                  </YStack>
                )}
              </YStack>
            </Card>
          </YStack>
        ) : createdRoutes.length > 3 ? (
          <FlatList
            horizontal
            data={createdRoutes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16 }}
            getItemLayout={(data, index) => {
              const screenWidth = DEVICE_WIDTH;
              const padding = 32; // 16 on each side
              const gap = 12; // gap between cards
              const cardWidth = (screenWidth - padding - gap * 2) / 3.5;
              return {
                length: cardWidth + gap,
                offset: (cardWidth + gap) * index,
                index,
              };
            }}
            snapToInterval={DEVICE_WIDTH / 3.5 + 12}
            decelerationRate="fast"
            snapToAlignment="start"
            renderItem={({ item: route }) => (
              <RouteItem route={route} onRoutePress={onRoutePress} />
            )}
          />
        ) : (
          <FlatList
            horizontal
            data={createdRoutes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16 }}
            renderItem={({ item: route }) => (
              <XStack marginRight="$3">
                <RouteCard
                  route={route}
                  // To allow 100% or fixed width, use a wrapper XStack and control its width
                  // Example: set width to 200, or '100%' for full width within scroll area
                  // Here, let's allow for 100% width; you can override as needed
                  style={{ width: '100%', maxWidth: 120, minWidth: 80 }} // change as needed!
                  onPress={() => {
                    if (onRoutePress) {
                      onRoutePress(route.id);
                    } else {
                      navigation.navigate('RouteDetail', { routeId: route.id });
                    }
                  }}
                />
              </XStack>
            )}
          />
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
