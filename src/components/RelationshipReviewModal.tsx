import React, { useState } from 'react';
import { Modal } from 'react-native';
import { YStack, XStack, Card, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { RelationshipReviewSection } from './RelationshipReviewSection';

interface RelationshipReviewModalProps {
  visible: boolean;
  onClose: () => void;
  profileUserId: string;
  profileUserRole: 'student' | 'instructor' | 'supervisor' | 'school';
  profileUserName: string;
  canReview: boolean;
  reviews: any[];
  onReviewAdded: () => void;
  title?: string;
  subtitle?: string;
  isRemovalContext?: boolean;
  onRemovalComplete?: () => void;
}

export function RelationshipReviewModal({
  visible,
  onClose,
  profileUserId,
  profileUserRole,
  profileUserName,
  canReview,
  reviews,
  onReviewAdded,
  title,
  subtitle,
  isRemovalContext = false,
  onRemovalComplete,
}: RelationshipReviewModalProps) {
  const handleReviewAdded = () => {
    onReviewAdded();
    if (isRemovalContext && onRemovalComplete) {
      // After review is submitted in removal context, complete the removal
      onRemovalComplete();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <YStack flex={1} backgroundColor="$background">
        <YStack flex={1} padding="$4" gap="$4">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text size="xl" weight="bold" color="$color">
                {title || `Review ${profileUserName}`}
              </Text>
              {subtitle && (
                <Text size="sm" color="$gray11" marginTop="$1">
                  {subtitle}
                </Text>
              )}
            </YStack>
            <Button onPress={onClose} variant="outlined" size="sm">
              <Feather name="x" size={16} />
            </Button>
          </XStack>

          {/* Review Section */}
          <YStack flex={1}>
            <RelationshipReviewSection
              profileUserId={profileUserId}
              profileUserRole={profileUserRole}
              profileUserName={profileUserName}
              canReview={canReview}
              reviews={reviews}
              onReviewAdded={handleReviewAdded}
            />
          </YStack>

          {/* Footer */}
          {isRemovalContext && (
            <Card bordered padding="$3" backgroundColor="$backgroundStrong">
              <Text size="sm" color="$gray11" textAlign="center">
                After submitting your review, the relationship will be ended.
              </Text>
            </Card>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}
