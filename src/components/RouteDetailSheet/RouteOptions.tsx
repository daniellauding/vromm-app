import React from 'react';
import { Modal, Animated, Pressable, View, TouchableOpacity, Linking } from 'react-native';

import { YStack, Text, useTheme } from 'tamagui';
import { Button } from '../../components/Button';

import { Feather } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { ReportDialog } from '../report/ReportDialog';

export default function RouteOptions({
  routeData,
  visible,
  onClose,
}: {
  routeData: any;
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const iconColor = theme.color?.val || '#000000';
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');
  const [isShowReportDialog, setShowReportDialog] = React.useState(false);
  const [isShowDeleteConfirmSheet, setShowDeleteConfirmSheet] = React.useState(false);

  const handleOpenInMaps = React.useCallback(() => {
    if (!routeData?.waypoint_details?.length) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.noWaypointsAvailable') || 'No waypoints available for this route',
        type: 'error',
      });
      return;
    }

    const waypoints = routeData.waypoint_details;
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

    const maxIntermediateWaypoints = 8;
    const intermediateWaypoints = waypoints.slice(1, -1);
    let selectedWaypoints = intermediateWaypoints;

    if (intermediateWaypoints.length > maxIntermediateWaypoints) {
      const step = Math.floor(intermediateWaypoints.length / maxIntermediateWaypoints);
      selectedWaypoints = intermediateWaypoints
        .filter((_, index) => index % step === 0)
        .slice(0, maxIntermediateWaypoints);
    }

    const waypointsStr = selectedWaypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}`;

    Linking.openURL(googleMapsUrl);
  }, [routeData, showToast, t]);

  const handleDelete = React.useCallback(async () => {
    if (!user || !routeData) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.unableToDelete') || 'Unable to delete route',
        type: 'error',
      });
      return;
    }

    // Show confirmation sheet instead of alert
    setShowDeleteConfirmSheet(true);
  }, [routeData, showToast, t, user]);

  if (isShowReportDialog) {
    return (
      <ReportDialog
        reportableId={routeData.id}
        reportableType="route"
        onClose={() => {
          setShowReportDialog(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              backgroundColor: backgroundColor,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <YStack gap="$4">
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {t('routeDetail.routeOptions') || 'Route Options'}
              </Text>

              <YStack gap="$2">
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    handleOpenInMaps();
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Feather name="map" size={20} color={iconColor} />
                  <Text fontSize="$4" color="$color">
                    {t('routeDetail.openInMaps') || 'Open in Maps'}
                  </Text>
                </TouchableOpacity>

                {user?.id === routeData?.creator_id && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      handleDelete();
                    }}
                    style={{
                      padding: 16,
                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Feather name="trash-2" size={20} color={iconColor} />
                    <Text fontSize="$4" color="$color">
                      {t('routeDetail.deleteRoute') || 'Delete Route'}
                    </Text>
                  </TouchableOpacity>
                )}

                {user?.id !== routeData?.creator_id && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowReportDialog(true);
                    }}
                    style={{
                      padding: 16,
                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Feather name="flag" size={20} color={iconColor} />
                    <Text fontSize="$4" color="$color">
                      {t('routeDetail.reportRoute') || 'Report Route'}
                    </Text>
                  </TouchableOpacity>
                )}
              </YStack>

              <Button size="lg" variant="link" onPress={onClose}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
