import React from 'react';
import { Modal, Animated, Pressable, View, TouchableOpacity, Linking } from 'react-native';

import { YStack, Text, useTheme } from 'tamagui';
import { Button } from '../../components/Button';

import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ReportDialog } from '../report/ReportDialog';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useThemePreference } from '../../hooks/useThemeOverride';

export default function RouteOptions({
  routeData,
  visible,
  onClose,
  onRouteDeleted,
}: {
  routeData: any;
  visible: boolean;
  onClose: () => void;
  onRouteDeleted?: () => void;
}) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';
  const [isShowReportDialog, setShowReportDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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

  const handleDeleteRoute = React.useCallback(async () => {
    try {
      if (!user) return null;
      setDeleting(true);

      // Delete the route from database
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeData.id)
        .eq('creator_id', user.id); // Extra safety check

      if (error) {
        console.error('🗑️ [RouteOptions] Delete error:', error);
        throw error;
      }

      showToast({
        title: language === 'sv' ? 'Framgång' : 'Success',
        message: language === 'sv' ? 'Rutt borttagen' : 'Route deleted successfully',
        type: 'success',
      });

      // Close the options sheet
      onClose();

      // Notify parent that route was deleted
      if (onRouteDeleted) {
        onRouteDeleted();
      }
    } catch (error) {
      showToast({
        title: language === 'sv' ? 'Fel' : 'Error',
        message:
          language === 'sv'
            ? 'Kunde inte ta bort rutt. Försök igen.'
            : 'Failed to delete route. Please try again.',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }, [routeData, showToast, language, user, onClose, onRouteDeleted]);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
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
          {/* Drag Handle */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colorScheme === 'dark' ? '#555' : '#DDD',
              }}
            />
          </View>

          <YStack gap="$4">
            <Text
              fontSize={22}
              fontWeight="900"
              fontStyle="italic"
              color="$color"
              textAlign="center"
            >
              {t('routeDetail.routeOptions') || 'Route Options'}
            </Text>

            <YStack gap="$3">
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  handleOpenInMaps();
                }}
                style={{
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colorScheme === 'dark' ? '#333' : '#EEE',
                }}
              >
                <Feather name="map" size={20} color={iconColor} />
                <Text fontSize={16} color="$color">
                  {t('routeDetail.openInMaps') || 'Open in Maps'}
                </Text>
              </TouchableOpacity>

              {user?.id === routeData?.creator_id && (
                <TouchableOpacity
                  onPress={handleDeleteRoute}
                  disabled={deleting}
                  style={{
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  <Feather name="trash-2" size={20} color="#EF4444" />
                  <Text fontSize={16} color="#EF4444">
                    {deleting
                      ? t('common.loading') || 'Loading...'
                      : t('routeDetail.deleteRoute') || 'Delete Route'}
                  </Text>
                </TouchableOpacity>
              )}

              {user?.id !== routeData?.creator_id && (
                <TouchableOpacity
                  onPress={() => {
                    setShowReportDialog(true);
                  }}
                  style={{
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Feather name="flag" size={20} color={iconColor} />
                  <Text fontSize={16} color="$color">
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
    </Modal>
  );
}
