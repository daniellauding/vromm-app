import { RouteCard } from '@/src/components/RouteCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, ScrollView, Card } from 'tamagui';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Image, ImageSourcePropType, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/src/components';
import { EmptyState } from './EmptyState';

type DrivenRouteFromDB = {
  id: string;
  route_id: string | null;
  user_id: string | null;
  driven_at: string | null;
  routes: Route | null;
};

type DrivenRoute = Route & {
  driven_at: string;
};

const getRouteImage: (route: Route) => string | null = (route) => {
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

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
};

export const DrivenRoutes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [drivenRoutes, setDrivenRoutes] = React.useState<Route[]>([]);
  const colorScheme = useColorScheme();
  React.useEffect(() => {
    if (!user) return;
    const loadDrivenRoutes = async () => {
      if (!user) return;
      try {
        const { data: drivenData, error: drivenError } = await supabase
          .from('driven_routes')
          .select('*, routes(*, creator:creator_id(id, full_name))')
          .eq('user_id', user.id)
          .not('driven_at', 'is', null)
          .order('driven_at', { ascending: false });

        if (drivenError) throw drivenError;

        const transformedRoutes = (drivenData as DrivenRouteFromDB[])
          .filter((item) => item.driven_at && item.routes && isValidRoute(item.routes))
          .map((item) => {
            // We know routes is not null from the filter
            const route = item.routes!;
            return {
              ...route,
              driven_at: item.driven_at as string,
              id: route.id,
              name: route.name,
              media_attachments: route.media_attachments || [],
              difficulty: route.difficulty || null,
              spot_type: route.spot_type || null,
              category: route.category || null,
              description: route.description || null,
              waypoint_details: route.waypoint_details || [],
              creator_id: route.creator_id,
              created_at: route.created_at,
              updated_at: route.updated_at,
            };
          }) as DrivenRoute[];

        setDrivenRoutes(transformedRoutes);
      } catch (err) {
        console.error('Error loading driven routes:', err);
      }
    };
    loadDrivenRoutes();
  }, [user]);

  const onNavigateToRouteList = React.useCallback(() => {
    navigation.navigate('RouteList', {
      title: t('home.drivenRoutes'),
      routes: drivenRoutes,
      type: 'driven',
    });
  }, [drivenRoutes, navigation, t]);

  return (
    <YStack gap="$2">
      <SectionHeader
        title={t('home.drivenRoutes')}
        variant="chevron"
        onAction={onNavigateToRouteList}
        actionLabel={t('common.seeAll')}
      />
      {drivenRoutes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          <XStack gap="$3" paddingVertical="$2">
            {drivenRoutes.map((route) => {
              const imageUrl = getRouteImage(route);
              return (
                <Card
                  key={route.id}
                  bordered
                  elevate
                  backgroundColor="$backgroundStrong"
                  width={200}
                  height={240}
                  onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
                >
                  <YStack f={1}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl } as ImageSourcePropType}
                        style={{
                          width: '100%',
                          height: 120,
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <YStack
                        height={120}
                        backgroundColor="$gray5"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Feather name="image" size={32} color="$gray11" />
                      </YStack>
                    )}
                    <YStack padding="$3" gap="$1" flex={1}>
                      <Text size="md" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                        {route.name}
                      </Text>
                      <XStack space="$1" alignItems="center" marginTop="$1">
                        <Feather
                          name="user"
                          size={14}
                          color={colorScheme === 'dark' ? 'white' : 'black'}
                        />
                        <Text
                          color="$gray11"
                          size="xs"
                          onPress={() => {
                            if (route.creator?.id) {
                              navigation.navigate('PublicProfile', { userId: route.creator.id });
                            }
                          }}
                          pressStyle={{ opacity: 0.7 }}
                        >
                          {route.creator?.full_name || 'Unknown'}
                        </Text>
                      </XStack>
                      <Text size="sm" color="$gray11">
                        {route.difficulty?.toUpperCase()}
                      </Text>
                      {route.description && (
                        <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
                          {route.description}
                        </Text>
                      )}
                    </YStack>
                  </YStack>
                </Card>
              );
            })}
          </XStack>
        </ScrollView>
      ) : (
        <EmptyState title="No Driven Routes" message="Complete routes to see them here" />
      )}
    </YStack>
  );
};
