import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Progress, useTheme } from 'tamagui';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Database } from '../../lib/database.types';
import { Map } from './../Map';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Play } from '@tamagui/lucide-icons';
import Carousel from 'react-native-reanimated-carousel';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from './../ImageWithFallback';
import { ReviewSection } from './../ReviewSection';
import { CommentsSection } from './../CommentsSection';
import { AppAnalytics } from '../../utils/analytics';
import { Region } from '../../types/maps';
import { ReportDialog } from './../report/ReportDialog';
import {
  parseRecordingStats,
  isRecordedRoute,
  formatRecordingStatsDisplay,
} from '../../utils/routeUtils';
import { RouteExerciseList } from './../RouteExerciseList';
import { AddToPresetSheetModal } from './../AddToPresetSheet';
import { useModal } from '../../contexts/ModalContext';
import { IconButton } from './../IconButton';
import { useToast } from '../../contexts/ToastContext';
import { PIN_COLORS } from '../../styles/mapStyles';
import { CreateRouteSheet } from './../CreateRouteSheet';
import { UserProfileSheet } from './../UserProfileSheet';

import { getCarouselItems } from './utils';
import CarouselItem from './CarouselItem';
import RouteDetailsMini from './RouteDetailsMini';

const { height, width } = Dimensions.get('window');

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type RouteRow = Database['public']['Tables']['routes']['Row'];
type Json = Database['public']['Tables']['routes']['Row']['waypoint_details'];

type Review = {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  difficulty: DifficultyLevel;
  visited_at: string;
  images: { url: string }[];
  user?: {
    full_name: string;
  };
};

interface WaypointDetail {
  lat: number;
  lng: number;
  title: string;
  description?: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  has_quiz?: boolean;
  quiz_data?: any;
}

interface MediaAttachment {
  type: 'image' | 'video' | 'youtube';
  url: string;
  description?: string;
}

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

interface RawWaypointDetail {
  lat?: number | string;
  lng?: number | string;
  title?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface RawMediaAttachment {
  type?: 'image' | 'video' | 'youtube';
  url?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface SupabaseRouteResponse
  extends Omit<RouteRow, 'waypoint_details' | 'media_attachments' | 'suggested_exercises'> {
  creator: {
    id: string;
    full_name: string;
  } | null;
  waypoint_details: RawWaypointDetail[];
  media_attachments: RawMediaAttachment[];
  suggested_exercises: any;
  reviews: { count: number }[];
  average_rating: { rating: number }[];
}

type RouteData = Omit<RouteRow, 'waypoint_details' | 'media_attachments'> & {
  waypoint_details: (WaypointDetail & Json)[];
  media_attachments: (MediaAttachment & Json)[];
  exercises?: Exercise[];
  creator?: {
    id: string;
    full_name: string;
  };
  reviews?: { count: number }[];
  average_rating?: { rating: number }[];
};

interface RouteDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  routeId: string | null;
  onStartRoute?: (routeId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
  onReopen?: () => void;
  nearbyRoutes?: Array<{ id: string; name: string; waypoint_details?: any[] }>;
  onRouteChange?: (routeId: string) => void;
}

export default function RouteDetailsSheetContent({
  routeId,
  routeData,
  loading,
  refreshing,
  handleRefresh,
  isSaved,
  isDriven,
  handleSaveRoute,
  handleMarkDriven,
  allExercisesCompleted,
  error,
  onClose,
  showAdminControls,
}: {
  routeId: string | null;
  routeData: any;
  loading: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
  isSaved: boolean;
  isDriven: boolean;
  handleSaveRoute: () => void;
  handleMarkDriven: () => void;
  allExercisesCompleted: boolean;
  showAdminControls: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showAdminDeleteConfirmSheet, setShowAdminDeleteConfirmSheet] = useState(false);
  const { showToast } = useToast();
  let navigation: any = null;
  try {
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.warn('Navigation not available in modal context:', error);
    navigation = null;
  }

  const handleAdminDelete = React.useCallback(async () => {
    if (!showAdminControls || !routeData) return;

    // Show admin delete confirmation sheet
    setShowAdminDeleteConfirmSheet(true);
  }, [showAdminControls, routeData]);

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <YStack f={1} jc="center" ai="center">
          <Text>{t('routeDetail.loading') || 'Loading route data...'}</Text>
        </YStack>
      ) : error || !routeData ? (
        <YStack f={1} jc="center" ai="center" padding="$4">
          <Text color="$red10">{error || t('routeDetail.routeNotFound') || 'Route not found'}</Text>
          <Button
            onPress={onClose}
            marginTop="$4"
            icon={<Feather name="arrow-left" size={18} color="white" />}
            size="$4"
          >
            {t('common.goBack') || 'Go Back'}
          </Button>
        </YStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#00E6C3"
              colors={['#00E6C3']}
              progressBackgroundColor="#1a1a1a"
            />
          }
        >
          <YStack gap="$4">
            {/* Hero Carousel */}
            {getCarouselItems(routeData).length > 0 && (
              <View style={{ height: height * 0.3, borderRadius: 12, overflow: 'hidden' }}>
                <Carousel
                  loop
                  width={width - 32}
                  height={height * 0.3}
                  data={getCarouselItems(routeData)}
                  renderItem={({ item }) => <CarouselItem item={item} />}
                  onSnapToItem={setActiveMediaIndex}
                />
                {/* Pagination dots */}
                {getCarouselItems(routeData).length > 1 && (
                  <XStack
                    position="absolute"
                    bottom={16}
                    alignSelf="center"
                    gap="$2"
                    padding="$2"
                    backgroundColor="transparent"
                    borderRadius="$4"
                  >
                    {getCarouselItems(routeData).map((_, index) => (
                      <View
                        key={index}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            index === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                      />
                    ))}
                  </XStack>
                )}
              </View>
            )}

            {/* Route Name - placed below carousel */}
            <Text fontSize="$5" fontWeight="bold" color="$color" textAlign="left" marginTop="$2">
              {routeData?.name || t('routeDetail.loading') || 'Loading...'}
            </Text>

            {/* Action Buttons */}
            <YStack gap="$3">
              <XStack gap="$2" justifyContent="space-between">
                <IconButton
                  icon="bookmark"
                  label={
                    isSaved
                      ? t('routeDetail.saved') || 'Saved'
                      : t('routeDetail.saveRoute') || 'Save'
                  }
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
                  onPress={handleMarkDriven}
                  selected={isDriven}
                  backgroundColor="transparent"
                  borderColor="transparent"
                  flex={1}
                />
                {routeData?.exercises &&
                  Array.isArray(routeData.exercises) &&
                  routeData.exercises.length > 0 && (
                    <IconButton
                      icon="play"
                      label={
                        allExercisesCompleted
                          ? t('routeDetail.reviewExercises') || 'Review'
                          : t('routeDetail.startExercises') || 'Start'
                      }
                      onPress={() => {
                        if (routeData?.exercises) {
                          if (navigation) {
                            try {
                              navigation.navigate('RouteExercise', {
                                routeId: routeId!,
                                exercises: routeData.exercises,
                                routeName: routeData.name,
                                startIndex: 0,
                              });
                              onClose();
                            } catch (error) {
                              console.warn('Navigation not available in modal context:', error);
                              showToast({
                                title: t('common.error') || 'Error',
                                message:
                                  t('routeDetail.navigationNotAvailable') ||
                                  'Navigation not available in this context',
                                type: 'error',
                              });
                            }
                          } else {
                            console.warn('Navigation not available in modal context');
                            showToast({
                              title: t('common.error') || 'Error',
                              message:
                                t('routeDetail.navigationNotAvailable') ||
                                'Navigation not available in this context',
                              type: 'error',
                            });
                          }
                        }
                      }}
                      backgroundColor={isSaved ? 'transparent' : 'transparent'}
                      borderColor={isSaved ? 'transparent' : 'transparent'}
                      flex={1}
                    />
                  )}
                {showAdminControls && (
                  <IconButton
                    icon="trash-2"
                    label={t('routeDetail.adminDelete') || 'Delete'}
                    onPress={() => {
                      AppAnalytics.trackButtonPress('admin_delete', 'RouteDetailSheet', {
                        route_id: routeData?.id,
                      }).catch(() => {});
                      handleAdminDelete();
                    }}
                    backgroundColor={isSaved ? 'transparent' : 'transparent'}
                    borderColor={isSaved ? 'transparent' : 'transparent'}
                    flex={1}
                  />
                )}
                {user?.id === routeData?.creator_id && (
                  <IconButton
                    icon="edit-2"
                    label={t('routeDetail.addEdit') || 'Edit'}
                    onPress={() => {
                      AppAnalytics.trackButtonPress('edit_route', 'RouteDetailSheet', {
                        route_id: routeData?.id,
                      }).catch(() => {});
                      // Show CreateRouteSheet as modal
                      setShowCreateRouteSheet(true);
                    }}
                    backgroundColor={isSaved ? 'transparent' : 'transparent'}
                    borderColor={isSaved ? 'transparent' : 'transparent'}
                    flex={1}
                  />
                )}
                <IconButton
                  icon="more-vertical"
                  label="Options"
                  onPress={handleShowOptions}
                  backgroundColor={isSaved ? 'transparent' : 'transparent'}
                  borderColor={isSaved ? 'transparent' : 'transparent'}
                  flex={1}
                />
              </XStack>
            </YStack>

            {/* Basic Info Card */}
            <Card backgroundColor="$backgroundStrong" bordered padding="$4">
              <YStack gap="$2">
                <XStack gap="$2" alignItems="center" flexWrap="wrap">
                  <Text fontSize="$5" fontWeight="600" color="$color">
                    {routeData.difficulty?.toUpperCase() || ''}
                  </Text>
                  <Text fontSize="$4" color="$gray11">
                    •
                  </Text>
                  <Text fontSize="$5" color="$gray11">
                    {routeData.spot_type || ''}
                  </Text>
                  {routeData.spot_subtype && (
                    <>
                      <Text fontSize="$4" color="$gray11">
                        •
                      </Text>
                      <Text fontSize="$5" color="$gray11">
                        {routeData.spot_subtype}
                      </Text>
                    </>
                  )}
                  <Text fontSize="$4" color="$gray11">
                    •
                  </Text>
                  <Text fontSize="$5" color="$gray11">
                    {routeData.category || ''}
                  </Text>
                </XStack>

                {/* Creator info with clickable name */}
                {routeData.creator && (
                  <XStack alignItems="center" gap="$2" marginTop="$2">
                    <TouchableOpacity
                      onPress={() => handleNavigateToProfile(routeData.creator?.id || '')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Feather name="user" size={16} color={iconColor} />
                      <Text fontSize="$3" color="$color">
                        {routeData.creator.full_name || 'Unknown Creator'}
                      </Text>
                    </TouchableOpacity>
                  </XStack>
                )}

                {routeData.description && (
                  <Text fontSize="$4" color="$gray11" marginTop="$2">
                    {routeData.description}
                  </Text>
                )}
              </YStack>
            </Card>

            {/* Additional Metadata Section */}
            {getAdditionalMetadata().length > 0 && (
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
                      {getAdditionalMetadata().map((item, index) => (
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
                          <Text
                            fontSize="$4"
                            fontWeight="600"
                            color="$color"
                            textAlign="right"
                            flex={1}
                          >
                            {item.value}
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Card>
            )}

            {/* Recording Stats Card */}
            {isRecordedRoute(routeData) &&
              (() => {
                const recordingStats = parseRecordingStats(routeData.description || '');
                if (!recordingStats) return null;

                const formattedStats = formatRecordingStatsDisplay(recordingStats);

                return (
                  <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                    <YStack gap="$3">
                      <XStack alignItems="center" gap="$2">
                        <Feather name="activity" size={20} color={iconColor} />
                        <Text fontSize="$5" fontWeight="600" color="$color">
                          {t('routeDetail.recordingStats') || 'Recording Stats'}
                        </Text>
                      </XStack>

                      <YStack gap="$2">
                        {formattedStats.map((stat, index) => (
                          <XStack key={index} justifyContent="space-between" alignItems="center">
                            <XStack alignItems="center" gap="$2">
                              <Feather name={stat.icon as any} size={16} color="$gray11" />
                              <Text fontSize="$4" color="$gray11">
                                {stat.label}
                              </Text>
                            </XStack>
                            <Text fontSize="$4" fontWeight="600" color="$color">
                              {stat.value}
                            </Text>
                          </XStack>
                        ))}
                      </YStack>

                      <Text fontSize="$3" color="$gray9" fontStyle="italic">
                        {t('routeDetail.recordedWithGPS') || 'Recorded with live GPS tracking'}
                      </Text>
                    </YStack>
                  </Card>
                );
              })()}

            {/* Route Exercises Section */}
            {routeData.exercises &&
              Array.isArray(routeData.exercises) &&
              routeData.exercises.length > 0 && (
                <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                  <YStack gap="$4">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$5" fontWeight="600" color="$color">
                        {t('routeDetail.exercises')}
                      </Text>
                      <Button
                        onPress={() => {
                          if (routeData?.exercises) {
                            if (navigation) {
                              try {
                                navigation.navigate('RouteExercise', {
                                  routeId: routeId!,
                                  exercises: routeData.exercises,
                                  routeName: routeData.name,
                                  startIndex: 0,
                                });
                                onClose();
                              } catch (error) {
                                console.warn('Navigation not available in modal context:', error);
                                showToast({
                                  title: t('common.error') || 'Error',
                                  message:
                                    t('routeDetail.navigationNotAvailable') ||
                                    'Navigation not available in this context',
                                  type: 'error',
                                });
                              }
                            } else {
                              console.warn('Navigation not available in modal context');
                              showToast({
                                title: t('common.error') || 'Error',
                                message:
                                  t('routeDetail.navigationNotAvailable') ||
                                  'Navigation not available in this context',
                                type: 'error',
                              });
                            }
                          }
                        }}
                        backgroundColor="$blue10"
                        icon={<Feather name="play" size={16} color="white" />}
                        size="sm"
                      >
                        <Text color="white" fontSize="$3" fontWeight="600">
                          {allExercisesCompleted
                            ? t('routeDetail.reviewExercises') || 'Review'
                            : t('routeDetail.startExercises') || 'Start'}
                        </Text>
                      </Button>
                    </XStack>

                    {/* Exercise List Preview */}
                    <RouteExerciseList
                      exercises={routeData.exercises}
                      completedIds={completedExerciseIds}
                      maxPreview={3}
                      onExercisePress={(exercise, index) => {
                        if (routeData?.exercises) {
                          if (navigation) {
                            try {
                              navigation.navigate('RouteExercise', {
                                routeId: routeId!,
                                exercises: routeData.exercises,
                                routeName: routeData.name || 'Route',
                                startIndex: index,
                              });
                              onClose();
                            } catch (error) {
                              console.warn('Navigation not available in modal context:', error);
                              showToast({
                                title: t('common.error') || 'Error',
                                message:
                                  t('routeDetail.navigationNotAvailable') ||
                                  'Navigation not available in this context',
                                type: 'error',
                              });
                            }
                          } else {
                            console.warn('Navigation not available in modal context');
                            showToast({
                              title: t('common.error') || 'Error',
                              message:
                                t('routeDetail.navigationNotAvailable') ||
                                'Navigation not available in this context',
                              type: 'error',
                            });
                          }
                        }
                      }}
                    />

                    {/* Exercise Statistics */}
                    {exerciseStats && (
                      <Card bordered padding="$3" backgroundColor="$gray2">
                        <YStack gap="$2">
                          <Text fontSize={12} fontWeight="600" color="$gray11">
                            {t('routeDetail.yourProgress')}
                          </Text>
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text fontSize={11} color="$gray11">
                              {t('routeDetail.completed')}: {exerciseStats.completed}/
                              {exerciseStats.total}
                            </Text>
                            <Text fontSize={11} color="$gray11">
                              {Math.round((exerciseStats.completed / exerciseStats.total) * 100)}%
                            </Text>
                          </XStack>
                          <Progress
                            value={Math.round(
                              (exerciseStats.completed / exerciseStats.total) * 100,
                            )}
                            backgroundColor="$gray6"
                            size="$0.5"
                          >
                            <Progress.Indicator backgroundColor="$blue10" />
                          </Progress>
                        </YStack>
                      </Card>
                    )}
                  </YStack>
                </Card>
              )}

            {/* Reviews Section */}
            <Card backgroundColor="$backgroundStrong" bordered padding="$4">
              <YStack gap="$3">
                <TouchableOpacity
                  onPress={() => setShowReviewsDetails(!showReviewsDetails)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <XStack alignItems="center" gap="$2">
                    <Feather name="star" size={20} color={iconColor} />
                    <Text fontSize="$5" fontWeight="600" color="$color">
                      {t('routeDetail.reviews') || 'Reviews'}
                    </Text>
                    {reviews.length > 0 && (
                      <View
                        style={{
                          backgroundColor: '#00E6C3',
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          minWidth: 20,
                          alignItems: 'center',
                        }}
                      >
                        <Text fontSize={12} color="#000" fontWeight="bold">
                          {reviews.length}
                        </Text>
                      </View>
                    )}
                  </XStack>
                  <Feather
                    name={showReviewsDetails ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={iconColor}
                  />
                </TouchableOpacity>

                {showReviewsDetails && (
                  <YStack>
                    <ReviewSection
                      routeId={routeId!}
                      reviews={reviews}
                      onReviewAdded={loadReviews}
                    />
                  </YStack>
                )}
              </YStack>
            </Card>

            {/* Comments Section */}
            <Card backgroundColor="$backgroundStrong" bordered padding="$4">
              <YStack gap="$3">
                <TouchableOpacity
                  onPress={() => setShowCommentsDetails(!showCommentsDetails)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <XStack alignItems="center" gap="$2">
                    <Feather name="message-circle" size={20} color={iconColor} />
                    <Text fontSize="$5" fontWeight="600" color="$color">
                      {t('routeDetail.comments') || 'Comments'}
                    </Text>
                  </XStack>
                  <Feather
                    name={showCommentsDetails ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={iconColor}
                  />
                </TouchableOpacity>

                {showCommentsDetails && (
                  <YStack>
                    <CommentsSection targetType="route" targetId={routeId!} />
                  </YStack>
                )}
              </YStack>
            </Card>
          </YStack>
        </ScrollView>
      )}

      {/* Report dialog */}
      {showReportDialog && routeData && (
        <ReportDialog
          reportableId={routeData.id}
          reportableType="route"
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {/* Options Sheet */}
      {showOptionsSheet && (
        <Modal
          visible={showOptionsSheet}
          transparent
          animationType="none"
          onRequestClose={() => setShowOptionsSheet(false)}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'transparent',
            }}
          >
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowOptionsSheet(false)} />
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
                        setShowOptionsSheet(false);
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

                    {/* <TouchableOpacity
                                    onPress={() => {
                                      setShowOptionsSheet(false);
                                      handleShare();
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
                                    <Feather name="share" size={20} color={iconColor} />
                                    <Text fontSize="$4" color="$color">
                                      {t('routeDetail.shareRoute') || 'Share Route'}
                                    </Text>
                                  </TouchableOpacity> */}

                    {user?.id === routeData?.creator_id && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowOptionsSheet(false);
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
                          setShowOptionsSheet(false);
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

                  <Button size="lg" variant="link" onPress={() => setShowOptionsSheet(false)}>
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </YStack>
              </Animated.View>
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Driven Options Sheet */}
      {showDrivenOptionsSheet && (
        <Modal
          visible={showDrivenOptionsSheet}
          transparent
          animationType="none"
          onRequestClose={() => setShowDrivenOptionsSheet(false)}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'transparent',
            }}
          >
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowDrivenOptionsSheet(false)} />
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
                    {t('routeDetail.drivenOptions') || 'Driven Options'}
                  </Text>

                  <YStack gap="$2">
                    <TouchableOpacity
                      onPress={() => {
                        setShowDrivenOptionsSheet(false);
                        if (navigation) {
                          try {
                            navigation.navigate('AddReview', {
                              routeId: routeId!,
                              returnToRouteDetail: true,
                            } as any);
                            onClose();
                          } catch (error) {
                            console.warn('Navigation not available in modal context:', error);
                            showToast({
                              title: t('common.error') || 'Error',
                              message:
                                t('routeDetail.navigationNotAvailable') ||
                                'Navigation not available in this context',
                              type: 'error',
                            });
                          }
                        } else {
                          console.warn('Navigation not available in modal context');
                          showToast({
                            title: t('common.error') || 'Error',
                            message:
                              t('routeDetail.navigationNotAvailable') ||
                              'Navigation not available in this context',
                            type: 'error',
                          });
                        }
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
                      <Feather name="edit" size={20} color={iconColor} />
                      <Text fontSize="$4" color="$color">
                        {t('routeDetail.editReview') || 'Edit Review'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setShowDrivenOptionsSheet(false);
                        handleUnmarkDriven();
                      }}
                      style={{
                        padding: 16,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <Feather name="x-circle" size={20} color="#EF4444" />
                      <Text fontSize="$4" color="#EF4444">
                        {t('routeDetail.unmarkAsDriven') || 'Unmark as Driven'}
                      </Text>
                    </TouchableOpacity>
                  </YStack>

                  <Button
                    variant="outlined"
                    size="lg"
                    onPress={() => setShowDrivenOptionsSheet(false)}
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </YStack>
              </Animated.View>
            </View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}
