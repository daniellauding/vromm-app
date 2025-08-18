import React from 'react';
import { XStack, YStack } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';

type ProfileRatingBadgeProps = {
  averageRating: number;
  reviewCount: number;
  size?: 'sm' | 'md' | 'lg';
  showPreview?: boolean;
  recentReviews?: Array<{ content: string; rating: number; created_at: string }>;
};

export function ProfileRatingBadge({ 
  averageRating, 
  reviewCount, 
  size = 'md',
  showPreview = false,
  recentReviews = []
}: ProfileRatingBadgeProps) {
  if (reviewCount === 0) {
    return (
      <Text size="sm" color="$gray11">
        No reviews yet
      </Text>
    );
  }

  const badgeColor = averageRating >= 4.5 ? '$green10' : 
                    averageRating >= 4.0 ? '$blue10' : 
                    averageRating >= 3.0 ? '$orange10' : '$red10';
  
  const badgeText = averageRating >= 4.5 ? 'Excellent' : 
                   averageRating >= 4.0 ? 'Very Good' : 
                   averageRating >= 3.0 ? 'Good' : 'Needs Improvement';

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  const textSize = size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md';

  return (
    <YStack space="$2" alignItems="center">
      <XStack space="$2" alignItems="center">
        <XStack 
          space="$1" 
          alignItems="center" 
          backgroundColor={badgeColor} 
          paddingHorizontal={size === 'sm' ? '$1' : '$2'} 
          paddingVertical="$1" 
          borderRadius="$2"
        >
          <Feather name="star" size={iconSize} color="white" />
          <Text size={textSize} color="white" weight="medium">
            {averageRating.toFixed(1)}
          </Text>
        </XStack>
        <Text size={textSize} color="$gray11">
          {badgeText} ({reviewCount})
        </Text>
      </XStack>
      
      {/* Show preview of recent comments if enabled */}
      {showPreview && recentReviews.length > 0 && (
        <YStack space="$1" alignItems="center" maxWidth={300}>
          <Text size="xs" color="$gray11" textAlign="center" numberOfLines={2}>
            "{recentReviews[0].content.substring(0, 100)}{recentReviews[0].content.length > 100 ? '...' : ''}"
          </Text>
          {recentReviews.length > 1 && (
            <Text size="xs" color="$gray10">
              +{recentReviews.length - 1} more review{recentReviews.length > 2 ? 's' : ''}
            </Text>
          )}
        </YStack>
      )}
    </YStack>
  );
}
