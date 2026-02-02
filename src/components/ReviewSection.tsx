import React, { useState, useEffect } from 'react';
import { YStack, XStack, Card, TextArea } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Image, TouchableOpacity, View, Modal, Pressable, Animated } from 'react-native';
import { format } from 'date-fns';
import { Database } from '../lib/database.types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { AppAnalytics } from '../utils/analytics';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useToast } from '../contexts/ToastContext';

// Helper function to get translation with fallback
const getTranslation = (t: (key: string) => string, key: string, fallback: string): string => {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
};

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];

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

type ReviewImage = {
  id: string;
  uri: string;
  base64?: string;
  description?: string;
};

type ReviewSectionProps = {
  routeId: string;
  reviews: Review[];
  onReviewAdded: () => void;
  onOpenReviewSheet?: () => void;
};

export function ReviewSection({ routeId, reviews, onReviewAdded, onOpenReviewSheet }: ReviewSectionProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const { showToast } = useToast();
  const colorScheme = effectiveTheme || 'light';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const cardBg = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';
  const modalBg = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Rating, 2: Content & Images, 3: Details
  const [newReview, setNewReview] = useState({
    rating: 0,
    content: '',
    difficulty: 'beginner' as DifficultyLevel,
    images: [] as ReviewImage[],
    visited_at: new Date().toISOString(),
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ reviewId: string; reviewUserId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data && data.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError(t('review.permissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: true,
        base64: false,
      });

      if (!result.canceled) {
        const newImages: ReviewImage[] = result.assets.map((asset) => ({
          id: Date.now().toString() + Math.random(),
          uri: asset.uri,
          base64: undefined,
        }));
        setNewReview((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
      }
    } catch (err) {
      console.error('Error picking images:', err);
      setError(t('review.processingError'));
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert(t('auth.signin'), t('review.signInRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload images using the same stable method as AddReviewScreen
      const uploadedImages = await Promise.all(
        newReview.images.map(async (image) => {
          try {
            // Use the same stable method as AddReviewScreen
            const response = await fetch(image.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data.split(',')[1]); // Remove data URL prefix
              };
              reader.onerror = () => reject(new Error('Failed to process image'));
              reader.readAsDataURL(blob);
            });

            const fileName = `${Date.now()}-${Math.random()}.jpg`;
            const path = `review-images/${routeId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('review-images')
              .upload(path, decode(base64), {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from('review-images').getPublicUrl(path);

            return {
              url: publicUrl,
              description: image.description,
            };
          } catch (imageError) {
            console.error('Error processing image:', imageError);
            return null; // Skip failed images
          }
        }),
      );

      // Create review
      const { error: reviewError } = await supabase.from('route_reviews').insert({
        route_id: routeId,
        user_id: user.id,
        rating: newReview.rating,
        content: newReview.content,
        difficulty: newReview.difficulty,
        visited_at: newReview.visited_at,
        images: uploadedImages.filter(Boolean),
      });

      if (reviewError) throw reviewError;

      // Track review submission
      await AppAnalytics.trackReviewSubmit(routeId, newReview.rating);

      // Reset form and close
      setNewReview({
        rating: 0,
        content: '',
        difficulty: 'beginner',
        images: [],
        visited_at: new Date().toISOString(),
      });
      setShowReviewForm(false);
      setStep(1);
      onReviewAdded();

      Alert.alert(t('common.success'), t('routeDetail.reviewSubmitted'));
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert(t('common.error'), t('review.uploadError'));
    } finally {
      setLoading(false);
    }
  };

  // Show delete confirmation modal
  const handleDeleteReview = (reviewId: string, reviewUserId: string) => {
    const isOwner = user?.id === reviewUserId;
    const canDelete = isAdmin || isOwner;

    if (!canDelete) return;

    setDeleteTarget({ reviewId, reviewUserId });
    setShowDeleteModal(true);
  };

  // Actually perform the deletion
  const confirmDeleteReview = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('route_reviews').delete().eq('id', deleteTarget.reviewId);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeleteTarget(null);

      // Refresh reviews
      onReviewAdded();

      // Show success toast
      showToast({
        title: getTranslation(t, 'common.success', 'Success'),
        message: getTranslation(t, 'review.deleted', 'Review deleted successfully'),
        type: 'success',
      });
    } catch (err) {
      console.error('Delete review error:', err);
      showToast({
        title: getTranslation(t, 'common.error', 'Error'),
        message: getTranslation(t, 'review.deleteError', 'Failed to delete review'),
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Get delete modal content based on whether user is admin or owner
  const getDeleteModalContent = () => {
    if (!deleteTarget) return { title: '', message: '' };

    const isOwner = user?.id === deleteTarget.reviewUserId;

    return {
      title: isAdmin && !isOwner
        ? getTranslation(t, 'review.adminDeleteTitle', 'Admin: Delete Review')
        : getTranslation(t, 'review.deleteTitle', 'Delete Review'),
      message: isAdmin && !isOwner
        ? getTranslation(t, 'review.adminDeleteMessage', 'Are you sure you want to delete this review as an admin? This action cannot be undone.')
        : getTranslation(t, 'review.deleteMessage', 'Are you sure you want to delete your review? This action cannot be undone.'),
    };
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <YStack gap="$4">
            <Text size="lg" weight="medium" color="$color" textAlign="center">
              {getTranslation(t, 'reviewSection.rate', 'Rate this route')}
            </Text>
            <XStack gap="$2" justifyContent="center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => setNewReview((prev) => ({ ...prev, rating }))}
                  style={{ padding: 8 }}
                >
                  <MaterialIcons
                    name={newReview.rating >= rating ? 'star' : 'star-border'}
                    size={36}
                    color={newReview.rating >= rating ? '#FFD700' : borderColor}
                  />
                </TouchableOpacity>
              ))}
            </XStack>
            <Button
              onPress={() => setStep(2)}
              disabled={!newReview.rating}
              variant="primary"
              size="md"
            >
              {getTranslation(t, 'common.next', 'Next')}
            </Button>
          </YStack>
        );

      case 2:
        return (
          <YStack gap="$4">
            <Text size="lg" weight="medium" color="$color">
              {getTranslation(t, 'reviewSection.writeReview', 'Write your review')}
            </Text>
            <TextArea
              value={newReview.content}
              onChangeText={(content) => setNewReview((prev) => ({ ...prev, content }))}
              placeholder={getTranslation(t, 'review.reviewPlaceholder', 'Share your thoughts...')}
              numberOfLines={4}
              size="$4"
              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
              borderColor={borderColor}
            />
            <Button
              onPress={handlePickImages}
              variant="secondary"
              size="md"
            >
              <XStack alignItems="center" gap="$2">
                <Feather name="image" size={18} color={textColor} />
                <Text color="$color">{getTranslation(t, 'reviewSection.addImages', 'Add Images')}</Text>
              </XStack>
            </Button>
            {newReview.images.length > 0 && (
              <XStack flexWrap="wrap" gap="$2">
                {newReview.images.map((image) => (
                  <View key={image.id} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: image.uri }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setNewReview((prev) => ({
                          ...prev,
                          images: prev.images.filter((img) => img.id !== image.id),
                        }))
                      }
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="x" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </XStack>
            )}
            <XStack gap="$2">
              <Button style={{ flex: 1 }} onPress={() => setStep(1)} variant="secondary" size="md">
                {getTranslation(t, 'common.back', 'Back')}
              </Button>
              <Button style={{ flex: 1 }} onPress={() => setStep(3)} variant="primary" size="md">
                {getTranslation(t, 'common.next', 'Next')}
              </Button>
            </XStack>
          </YStack>
        );

      case 3:
        return (
          <YStack gap="$4">
            <Text size="lg" weight="medium" color="$color">
              {getTranslation(t, 'review.detailsStep', 'How difficult was it?')}
            </Text>
            <YStack gap="$2">
              <Text size="sm" color="$gray11">
                {getTranslation(t, 'reviewSection.difficultyLevel', 'Difficulty Level')}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {['beginner', 'intermediate', 'advanced'].map((level) => {
                  const isSelected = newReview.difficulty === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() =>
                        setNewReview((prev) => ({ ...prev, difficulty: level as DifficultyLevel }))
                      }
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSelected ? '#27febe' : borderColor,
                        backgroundColor: isSelected ? '#27febe' : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#000000' : textColor,
                          fontWeight: isSelected ? '600' : '500',
                          fontSize: 14,
                        }}
                      >
                        {getTranslation(t, `profile.experienceLevels.${level}`, level.charAt(0).toUpperCase() + level.slice(1))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </XStack>
            </YStack>
            <XStack gap="$2">
              <Button style={{ flex: 1 }} onPress={() => setStep(2)} variant="secondary" size="md">
                {getTranslation(t, 'common.back', 'Back')}
              </Button>
              <Button
                style={{ flex: 1 }}
                onPress={handleSubmitReview}
                disabled={loading}
                variant="primary"
                size="md"
              >
                {loading
                  ? getTranslation(t, 'reviewSection.submitting', 'Submitting...')
                  : getTranslation(t, 'reviewSection.submitReview', 'Submit Review')}
              </Button>
            </XStack>
          </YStack>
        );
    }
  };

  const handleOpenReview = () => {
    if (onOpenReviewSheet) {
      onOpenReviewSheet();
    } else {
      setShowReviewForm(true);
    }
  };

  return (
    <YStack gap="$3">
      {showReviewForm ? (
        <Card
          backgroundColor={cardBg}
          borderColor={borderColor}
          borderWidth={1}
          padding="$4"
          borderRadius={12}
        >
          <YStack gap="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text size="lg" weight="medium" color="$color">
                {step === 1
                  ? getTranslation(t, 'reviewSection.stepRating', 'Step 1: Rating')
                  : step === 2
                    ? getTranslation(t, 'reviewSection.stepReview', 'Step 2: Review')
                    : getTranslation(t, 'reviewSection.stepDetails', 'Step 3: Details')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewForm(false);
                  setStep(1);
                  setNewReview({
                    rating: 0,
                    content: '',
                    difficulty: 'beginner',
                    images: [],
                    visited_at: new Date().toISOString(),
                  });
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#F5F5F5',
                }}
              >
                <Feather name="x" size={18} color={textColor} />
              </TouchableOpacity>
            </XStack>
            {renderStepContent()}
            {error && (
              <Text size="sm" color="$red10" textAlign="center">
                {error}
              </Text>
            )}
          </YStack>
        </Card>
      ) : (
        <YStack gap="$3">
          {reviews.length === 0 ? (
            <YStack gap="$3" alignItems="center">
              <Text color="$gray11" textAlign="center">
                {getTranslation(t, 'routeDetail.noReviews', 'No reviews yet. Be the first to share your experience!')}
              </Text>
              <Button
                onPress={handleOpenReview}
                variant="primary"
                size="md"
              >
                {getTranslation(t, 'routeDetail.writeReview', 'Write Review')}
              </Button>
            </YStack>
          ) : (
            reviews.map((review) => (
              <Card
                key={review.id}
                backgroundColor={cardBg}
                borderColor={borderColor}
                borderWidth={1}
                padding="$4"
                borderRadius={12}
              >
                <YStack gap="$3">
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack gap="$1">
                      <Text fontWeight="600" color="$color" fontSize={16}>
                        {review.user?.full_name || getTranslation(t, 'routeDetail.anonymous', 'Anonymous')}
                      </Text>
                      <Text fontSize={12} color="$gray11">
                        {format(new Date(review.visited_at), 'MMM d, yyyy')}
                      </Text>
                    </YStack>

                    {(isAdmin || user?.id === review.user_id) && (
                      <TouchableOpacity
                        onPress={() => handleDeleteReview(review.id, review.user_id)}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        }}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </XStack>

                  <XStack gap={4}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <MaterialIcons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-border'}
                        size={18}
                        color={i < review.rating ? '#FFD700' : (colorScheme === 'dark' ? '#555' : '#DDD')}
                      />
                    ))}
                  </XStack>

                  {review.content && (
                    <Text color="$color" fontSize={14} lineHeight={20}>
                      {review.content}
                    </Text>
                  )}

                  {review.images && review.images.length > 0 && (
                    <XStack flexWrap="wrap" gap="$2">
                      {review.images.map((image, index) => (
                        <Image
                          key={index}
                          source={{ uri: image.url }}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                          }}
                        />
                      ))}
                    </XStack>
                  )}
                </YStack>
              </Card>
            ))
          )}
          {/* Add review button when there are existing reviews */}
          {reviews.length > 0 && !showReviewForm && (
            <Button
              onPress={handleOpenReview}
              variant="primary"
              size="md"
            >
              {getTranslation(t, 'routeDetail.writeReview', 'Write Review')}
            </Button>
          )}
        </YStack>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowDeleteModal(false)} />
          <Animated.View
            style={{
              backgroundColor: modalBg,
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

            <YStack gap="$4" alignItems="center">
              {/* Title */}
              <Text
                fontSize={20}
                fontWeight="700"
                color={textColor}
                textAlign="center"
              >
                {getDeleteModalContent().title}
              </Text>

              {/* Message */}
              <Text
                fontSize={14}
                color={colorScheme === 'dark' ? '#888' : '#666'}
                textAlign="center"
                paddingHorizontal="$2"
              >
                {getDeleteModalContent().message}
              </Text>

              {/* Buttons */}
              <YStack gap="$3" width="100%" marginTop="$2">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={confirmDeleteReview}
                  disabled={deleting}
                >
                  {deleting
                    ? getTranslation(t, 'common.loading', 'Loading...')
                    : getTranslation(t, 'review.delete', 'Delete')}
                </Button>

                <Button
                  variant="link"
                  size="lg"
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  {getTranslation(t, 'common.cancel', 'Cancel')}
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Modal>
    </YStack>
  );
}
