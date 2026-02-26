import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { format, isValid } from 'date-fns';
import { useTranslation } from '../../contexts/TranslationContext';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../Button';
import { ReportDialog } from '../report/ReportDialog';

type Review = {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  difficulty: string;
  visited_at: string;
  images: { url: string }[];
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
};

interface ReviewsListProps {
  reviews: Review[];
  onNavigateToProfile: (userId: string) => void;
  onOpenReviewSheet?: () => void;
}

function formatReviewDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isValid(date)) return '';
    return format(date, 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export default function ReviewsList({
  reviews,
  onNavigateToProfile,
  onOpenReviewSheet,
}: ReviewsListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reportReviewId, setReportReviewId] = useState<string | null>(null);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 5);

  return (
    <YStack gap="$3">
      {/* Header: Reviews title + summary */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={18} fontWeight="700" color="$color">
            {t('routeDetail.reviews') || 'Reviews'}
          </Text>
          {reviews.length > 0 && (
            <XStack alignItems="center" gap={4}>
              <Text fontSize={14} color="#F5A623">
                ★
              </Text>
              <Text fontSize={14} fontWeight="600" color="$color">
                {avgRating.toFixed(1)}
              </Text>
              <Text fontSize={13} color="$gray8">
                ({reviews.length})
              </Text>
            </XStack>
          )}
        </XStack>
        <Button
          variant="link"
          size="sm"
          onPress={() => onOpenReviewSheet?.()}
        >
          {t('routeDetail.writeReview') || 'Write Review'}
        </Button>
      </XStack>

      {/* No reviews state */}
      {reviews.length === 0 && (
        <Text fontSize={14} color="$gray8">
          {t('routeDetail.noReviews') ||
            'No reviews yet. Be the first to share your experience!'}
        </Text>
      )}

      {/* Review cards */}
      {visibleReviews.map((review) => (
        <YStack
          key={review.id}
          gap="$2"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderBottomColor={colorScheme === 'dark' ? '#333' : '#EEE'}
        >
          <XStack alignItems="center" justifyContent="space-between">
            {/* Avatar + name + date */}
            <TouchableOpacity
              onPress={() => {
                const profileId = review.user?.id || review.user_id;
                if (profileId) onNavigateToProfile(profileId);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                flex: 1,
              }}
            >
              {review.user?.avatar_url ? (
                <Image
                  source={{ uri: review.user.avatar_url }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      colorScheme === 'dark' ? '#333' : '#E5E5E5',
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#00E6C3',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text fontSize={14} fontWeight="700" color="#000">
                    {(review.user?.full_name || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <YStack flex={1}>
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color="$color"
                  numberOfLines={1}
                >
                  {review.user?.full_name ||
                    t('routeDetail.anonymous') ||
                    'Anonymous'}
                </Text>
                {review.visited_at && (
                  <Text fontSize={11} color="$gray8">
                    {formatReviewDate(review.visited_at)}
                  </Text>
                )}
              </YStack>
            </TouchableOpacity>

            {/* Rating stars */}
            <XStack gap={2}>
              {Array.from({ length: 5 }).map((_, i) => (
                <MaterialIcons
                  key={i}
                  name={i < (review.rating || 0) ? 'star' : 'star-border'}
                  size={14}
                  color={
                    i < (review.rating || 0)
                      ? '#F5A623'
                      : colorScheme === 'dark'
                        ? '#555'
                        : '#DDD'
                  }
                />
              ))}
            </XStack>
          </XStack>

          {/* Review content */}
          {review.content ? (
            <Text fontSize={13} color="$gray11" lineHeight={18}>
              {review.content}
            </Text>
          ) : null}

          {/* Review images */}
          {review.images && review.images.length > 0 && (
            <XStack flexWrap="wrap" gap="$2">
              {review.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.url }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                  }}
                />
              ))}
            </XStack>
          )}

          {/* Actions: report */}
          {user?.id !== review.user_id && (
            <TouchableOpacity
              onPress={() => setReportReviewId(review.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                alignSelf: 'flex-start',
                paddingVertical: 4,
              }}
            >
              <Feather
                name="flag"
                size={12}
                color={colorScheme === 'dark' ? '#666' : '#999'}
              />
              <Text fontSize={11} color="$gray8">
                {t('common.report') || 'Report'}
              </Text>
            </TouchableOpacity>
          )}
        </YStack>
      ))}

      {/* Show more / show less */}
      {reviews.length > 5 && (
        <TouchableOpacity onPress={() => setShowAllReviews(!showAllReviews)}>
          <Text fontSize={13} color="$gray8">
            {showAllReviews
              ? t('common.showLess') || 'Show less'
              : `${t('common.showMore') || 'Show more'} (${reviews.length - 5})`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Report dialog rendered alongside, not replacing */}
      {reportReviewId && (
        <ReportDialog
          reportableId={reportReviewId}
          reportableType="review"
          onClose={() => setReportReviewId(null)}
        />
      )}
    </YStack>
  );
}
