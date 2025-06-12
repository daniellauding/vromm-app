import React, { useState, useEffect } from 'react';
import { YStack, XStack, Card, Button, TextArea } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { Image } from 'react-native';
import { format } from 'date-fns';
import { Database } from '../lib/database.types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { AppAnalytics } from '../utils/analytics';
import { Alert } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';

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
};

export function ReviewSection({ routeId, reviews, onReviewAdded }: ReviewSectionProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
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
        base64: true,
      });

      if (!result.canceled) {
        const newImages: ReviewImage[] = result.assets.map((asset) => ({
          id: Date.now().toString() + Math.random(),
          uri: asset.uri,
          base64: asset.base64 || undefined,
        }));
        setNewReview((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
      }
    } catch (err) {
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

      // Upload images first
      const uploadedImages = await Promise.all(
        newReview.images.map(async (image) => {
          if (!image.base64) return null;

          const fileName = `${Date.now()}-${Math.random()}.jpg`;
          const path = `review-images/${routeId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('review-images')
            .upload(path, decode(image.base64), {
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

  // Add admin delete review function
  const handleAdminDeleteReview = async (reviewId: string) => {
    if (!isAdmin) return;

    Alert.alert(
      'Admin: Delete Review',
      'Are you sure you want to delete this review as an admin? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('route_reviews').delete().eq('id', reviewId);

              if (error) throw error;

              // Refresh reviews
              onReviewAdded();

              // Show confirmation
              Alert.alert('Success', 'Review deleted by admin');
            } catch (err) {
              console.error('Admin delete review error:', err);
              Alert.alert('Error', 'Failed to delete review');
            }
          },
        },
      ],
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <YStack space="$4">
            <Text size="lg" weight="medium" color="$color">
              {t('reviewSection.rate')}
            </Text>
            <XStack space="$2" justifyContent="center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  size="$4"
                  variant="outlined"
                  backgroundColor={newReview.rating >= rating ? '$yellow10' : undefined}
                  onPress={() => setNewReview((prev) => ({ ...prev, rating }))}
                >
                  <Feather
                    name="star"
                    size={24}
                    color={newReview.rating >= rating ? 'white' : undefined}
                  />
                </Button>
              ))}
            </XStack>
            <Button
              onPress={() => setStep(2)}
              disabled={!newReview.rating}
              variant="outlined"
              size="lg"
            >
              {t('common.next')}
            </Button>
          </YStack>
        );

      case 2:
        return (
          <YStack space="$4">
            <Text size="lg" weight="medium" color="$color">
              {t('reviewSection.writeReview')}
            </Text>
            <TextArea
              value={newReview.content}
              onChangeText={(content) => setNewReview((prev) => ({ ...prev, content }))}
              placeholder={t('review.reviewPlaceholder')}
              numberOfLines={4}
              size="$4"
            />
            <Button
              onPress={handlePickImages}
              variant="outlined"
              size="lg"
              icon={<Feather name="image" size={18} />}
            >
              {t('reviewSection.addImages')}
            </Button>
            {newReview.images.length > 0 && (
              <XStack flexWrap="wrap" gap="$2">
                {newReview.images.map((image) => (
                  <Card key={image.id} bordered elevate size="$2" padding="$2">
                    <Image
                      source={{ uri: image.uri }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    />
                    <Button
                      position="absolute"
                      top={4}
                      right={4}
                      size="$2"
                      variant="outlined"
                      backgroundColor="$red10"
                      onPress={() =>
                        setNewReview((prev) => ({
                          ...prev,
                          images: prev.images.filter((img) => img.id !== image.id),
                        }))
                      }
                    >
                      <Feather name="x" size={16} color="white" />
                    </Button>
                  </Card>
                ))}
              </XStack>
            )}
            <XStack space="$2">
              <Button flex={1} onPress={() => setStep(1)} variant="outlined" size="lg">
                {t('common.back')}
              </Button>
              <Button flex={1} onPress={() => setStep(3)} variant="outlined" size="lg">
                {t('common.next')}
              </Button>
            </XStack>
          </YStack>
        );

      case 3:
        return (
          <YStack space="$4">
            <Text size="lg" weight="medium" color="$color">
              {t('review.detailsStep')}
            </Text>
            <YStack space="$2">
              <Text size="sm" color="$gray11">
                {t('reviewSection.difficultyLevel')}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <Button
                    key={level}
                    onPress={() =>
                      setNewReview((prev) => ({ ...prev, difficulty: level as DifficultyLevel }))
                    }
                    variant="outlined"
                    backgroundColor={newReview.difficulty === level ? '$blue10' : undefined}
                    size="lg"
                  >
                    {t(`profile.experienceLevels.${level}`)}
                  </Button>
                ))}
              </XStack>
            </YStack>
            <XStack space="$2">
              <Button flex={1} onPress={() => setStep(2)} variant="outlined" size="lg">
                {t('common.back')}
              </Button>
              <Button
                flex={1}
                onPress={handleSubmitReview}
                disabled={loading}
                variant="outlined"
                size="lg"
              >
                {loading ? t('reviewSection.submitting') : t('reviewSection.submitReview')}
              </Button>
            </XStack>
          </YStack>
        );
    }
  };

  return (
    <Card bordered elevate size="$4" padding="$4">
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <Text size="lg" weight="medium" color="$color">
            {t('routeDetail.reviews')}
          </Text>
          {!showReviewForm && (
            <Button
              onPress={() => setShowReviewForm(true)}
              variant="outlined"
              size="md"
              backgroundColor="$blue10"
              icon={<Feather name="plus" size={18} color="white" />}
            >
              {t('routeDetail.writeReview')}
            </Button>
          )}
        </XStack>

        {showReviewForm ? (
          <Card bordered size="$4" padding="$4">
            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text size="lg" weight="medium" color="$color">
                  {step === 1
                    ? t('reviewSection.stepRating')
                    : step === 2
                      ? t('reviewSection.stepReview')
                      : t('reviewSection.stepDetails')}
                </Text>
                <Button
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
                  variant="outlined"
                  size="sm"
                  icon={<Feather name="x" size={18} />}
                />
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
          <YStack space="$4">
            {reviews.length === 0 ? (
              <Text color="$gray11" textAlign="center">
                {t('routeDetail.noReviews')}
              </Text>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} bordered size="$4" padding="$4">
                  <YStack space="$2">
                    <XStack space="$2" alignItems="center" justifyContent="space-between">
                      <XStack space="$2" alignItems="center">
                        <YStack>
                          <Text weight="medium" color="$color">
                            {review.user?.full_name || t('routeDetail.anonymous')}
                          </Text>
                          <Text size="sm" color="$gray11">
                            {format(new Date(review.visited_at), 'MMM d, yyyy')}
                          </Text>
                        </YStack>
                      </XStack>

                      {isAdmin && (
                        <Button
                          size="$2"
                          variant="outlined"
                          backgroundColor="$red10"
                          onPress={() => handleAdminDeleteReview(review.id)}
                        >
                          <Feather name="trash-2" size={16} color="white" />
                        </Button>
                      )}
                    </XStack>
                    <XStack space="$1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Feather
                          key={i}
                          name="star"
                          size={16}
                          color={i < review.rating ? '#FFD700' : '#E5E5E5'}
                        />
                      ))}
                    </XStack>
                    <Text color="$color">{review.content}</Text>
                    {review.images && review.images.length > 0 && (
                      <XStack flexWrap="wrap" gap="$2">
                        {review.images.map((image, index) => (
                          <Image
                            key={index}
                            source={{ uri: image.url }}
                            style={{ width: 80, height: 80, borderRadius: 8 }}
                          />
                        ))}
                      </XStack>
                    )}
                  </YStack>
                </Card>
              ))
            )}
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
