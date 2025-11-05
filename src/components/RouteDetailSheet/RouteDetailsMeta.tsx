import React from 'react';
import { TouchableOpacity } from 'react-native';

import { YStack, XStack, Text, Card, useTheme } from 'tamagui';

import { Feather } from '@expo/vector-icons';
import { useTranslation } from '@/src/contexts/TranslationContext';

export default function RouteDetailsMeta({ routeData }: { routeData: any }) {
  const [showMetadataDetails, setShowMetadataDetails] = React.useState(false);
  const theme = useTheme();
  const { t } = useTranslation();
  const iconColor = theme.color?.val || '#000000';

  // Get additional metadata that's not currently displayed
  const metaData = React.useMemo(() => {
    if (!routeData) return [];

    const metadata = [];

    // Route type and visibility
    if (routeData.route_type) {
      metadata.push({ label: 'Route Type', value: routeData.route_type, icon: 'map' });
    }
    if (routeData.visibility) {
      metadata.push({ label: 'Visibility', value: routeData.visibility, icon: 'eye' });
    }

    // Vehicle and transmission info
    if (
      routeData.vehicle_types &&
      Array.isArray(routeData.vehicle_types) &&
      routeData.vehicle_types.length > 0
    ) {
      metadata.push({
        label: 'Vehicle Types',
        value: routeData.vehicle_types.join(', '),
        icon: 'truck',
      });
    }
    if (routeData.transmission_type) {
      metadata.push({
        label: 'Transmission',
        value: routeData.transmission_type,
        icon: 'settings',
      });
    }

    // Activity and timing info
    if (routeData.activity_level) {
      metadata.push({ label: 'Activity Level', value: routeData.activity_level, icon: 'activity' });
    }
    if (routeData.best_times) {
      metadata.push({ label: 'Best Times', value: routeData.best_times, icon: 'clock' });
    }
    if (routeData.best_season) {
      metadata.push({ label: 'Best Season', value: routeData.best_season, icon: 'sun' });
    }

    // Location details
    if (routeData.full_address) {
      metadata.push({ label: 'Full Address', value: routeData.full_address, icon: 'map-pin' });
    }
    if (routeData.country) {
      metadata.push({ label: 'Country', value: routeData.country, icon: 'globe' });
    }
    if (routeData.region) {
      metadata.push({ label: 'Region', value: routeData.region, icon: 'map' });
    }

    // Brand info
    if (routeData.brand) {
      metadata.push({ label: 'Brand', value: routeData.brand, icon: 'tag' });
    }

    // Duration and status
    if (routeData.estimated_duration_minutes) {
      const hours = Math.floor(routeData.estimated_duration_minutes / 60);
      const minutes = routeData.estimated_duration_minutes % 60;
      const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      metadata.push({ label: 'Estimated Duration', value: durationText, icon: 'clock' });
    }
    if (routeData.status) {
      metadata.push({ label: 'Status', value: routeData.status, icon: 'check-circle' });
    }

    // Creation and update info
    if (routeData.created_at) {
      const createdDate = new Date(routeData.created_at).toLocaleDateString();
      metadata.push({ label: 'Created', value: createdDate, icon: 'calendar' });
    }
    if (routeData.updated_at && routeData.updated_at !== routeData.created_at) {
      const updatedDate = new Date(routeData.updated_at).toLocaleDateString();
      metadata.push({ label: 'Last Updated', value: updatedDate, icon: 'edit' });
    }

    // Additional flags
    if (routeData.is_public !== undefined) {
      metadata.push({
        label: 'Public Route',
        value: routeData.is_public ? 'Yes' : 'No',
        icon: routeData.is_public ? 'globe' : 'lock',
      });
    }
    if (routeData.is_verified !== undefined) {
      metadata.push({
        label: 'Verified',
        value: routeData.is_verified ? 'Yes' : 'No',
        icon: routeData.is_verified ? 'check-circle' : 'alert-circle',
      });
    }
    if ((routeData as any).is_draft !== undefined) {
      metadata.push({
        label: 'Draft',
        value: (routeData as any).is_draft ? 'Yes' : 'No',
        icon: (routeData as any).is_draft ? 'edit' : 'check',
      });
    }

    return metadata;
  }, [routeData]);

  if (metaData.length === 0) return null;

  return (
    <Card backgroundColor="$backgroundStrong" bordered padding="$4">
      <YStack gap="$3">
        <TouchableOpacity
          onPress={() => setShowMetadataDetails(!showMetadataDetails)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <XStack alignItems="center" gap="$2">
            <Feather name="info" size={20} color={iconColor} />
            <Text fontSize="$5" fontWeight="600" color="$color">
              {t('routeDetail.additionalInfo') || 'Additional Information'}
            </Text>
          </XStack>
          <Feather
            name={showMetadataDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={iconColor}
          />
        </TouchableOpacity>

        {showMetadataDetails && (
          <YStack gap="$2">
            {metaData.map((item, index) => (
              <XStack
                key={index}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$1"
              >
                <XStack alignItems="center" gap="$2" flex={1}>
                  <Feather name={item.icon as any} size={16} color="$gray11" />
                  <Text fontSize="$4" color="$gray11" flex={1}>
                    {item.label}
                  </Text>
                </XStack>
                <Text fontSize="$4" fontWeight="600" color="$color" textAlign="right" flex={1}>
                  {item.value}
                </Text>
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
