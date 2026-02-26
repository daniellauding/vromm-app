import React from 'react';
import { XStack, YStack } from 'tamagui';
import { IconButton } from '../IconButton';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import DrivenOptionsModal from './DrivenOptionsModal';
import { AppAnalytics } from '../../utils/analytics';
import { CreateRouteSheet } from '../CreateRouteSheet';
import RouteOptions from './RouteOptions';
import { useRouteActions } from './useRouteActions';

export default function RouteActions({
  routeId,
  routeData,
  onClose,
  handleRefresh,
  onOpenReviewSheet,
}: {
  routeId: string | null;
  routeData: any;
  onClose: () => void;
  handleRefresh: () => void;
  onOpenReviewSheet?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isShowDrivenOptionsSheet, setShowDrivenOptionsSheet] = React.useState(false);
  const [showCreateRouteSheet, setShowCreateRouteSheet] = React.useState(false);
  const [isShowOptionsSheet, setShowOptionsSheet] = React.useState(false);

  let navigation: any = null;
  try {
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.warn('Navigation not available in modal context:', error);
    navigation = null;
  }

  const { isSaved, isDriven, setIsDriven, handleSaveRoute, handleMarkDriven } = useRouteActions({
    routeId,
    onOpenReviewSheet,
    onClose,
    navigation,
  });

  const onMarkDrivenPress = React.useCallback(async () => {
    const result = await handleMarkDriven();
    if (result === 'already_driven') {
      setShowDrivenOptionsSheet(true);
    }
  }, [handleMarkDriven]);

  return (
    <YStack gap="$3">
      <XStack gap="$2" justifyContent="space-between">
        <IconButton
          icon="bookmark"
          label={isSaved ? t('routeDetail.saved') || 'Saved' : t('routeDetail.saveRoute') || 'Save'}
          onPress={handleSaveRoute}
          selected={isSaved}
          backgroundColor="transparent"
          borderColor="transparent"
          flex={1}
        />
        <IconButton
          icon="check-circle"
          label={
            isDriven
              ? t('routeDetail.markedAsDriven') || 'Marked as Driven'
              : t('routeDetail.markAsDriven') || 'Mark as Driven'
          }
          onPress={onMarkDrivenPress}
          selected={isDriven}
          backgroundColor="transparent"
          borderColor="transparent"
          flex={1}
        />
        {user?.id === routeData?.creator_id && (
          <IconButton
            icon="edit-2"
            label={t('routeDetail.addEdit') || 'Edit'}
            onPress={() => {
              AppAnalytics.trackButtonPress('edit_route', 'RouteDetailSheet', {
                route_id: routeData?.id,
              }).catch(() => {});
              setShowCreateRouteSheet(true);
            }}
            backgroundColor="transparent"
            borderColor="transparent"
            flex={1}
          />
        )}
        <IconButton
          icon="more-vertical"
          label="Options"
          onPress={() => setShowOptionsSheet(true)}
          backgroundColor="transparent"
          borderColor="transparent"
          flex={1}
        />
      </XStack>
      <DrivenOptionsModal
        routeId={routeId}
        visible={isShowDrivenOptionsSheet}
        onClose={() => setShowDrivenOptionsSheet(false)}
        onChange={({ isDriven }) => setIsDriven(isDriven)}
      />
      {showCreateRouteSheet && routeData && (
        <CreateRouteSheet
          visible={showCreateRouteSheet}
          onClose={() => {
            setShowCreateRouteSheet(false);
            handleRefresh();
          }}
          routeId={routeData.id}
          onRouteUpdated={(updatedRouteId) => {
            console.log('Route updated:', updatedRouteId);
            setShowCreateRouteSheet(false);
            handleRefresh();
          }}
          isModal={true}
        />
      )}
      {isShowOptionsSheet && (
        <RouteOptions
          routeData={routeData}
          onClose={() => setShowOptionsSheet(false)}
          visible={isShowOptionsSheet}
          onRouteDeleted={() => {
            console.log('[RouteActions] Route deleted, closing detail sheet');
            setShowOptionsSheet(false);
            onClose();
          }}
        />
      )}
    </YStack>
  );
}
