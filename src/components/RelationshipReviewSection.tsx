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
import { Alert } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';

type RelationshipReview = {
  id: string;
  student_id: string;
  supervisor_id: string;
  reviewer_id: string;
  rating: number;
  content: string;
  review_type: 'student_reviews_supervisor' | 'supervisor_reviews_student';
  is_anonymous: boolean;
  created_at: string;
  is_reported: boolean;
  report_count: number;
  reviewer_profile?: {
    full_name: string;
  };
};

type ReviewImage = {
  id: string;
  uri: string;
  base64?: string;
  description?: string;
};

type RelationshipReviewSectionProps = {
  profileUserId: string; // The user being reviewed
  profileUserRole: 'student' | 'instructor' | 'supervisor' | 'school';
  profileUserName: string;
  canReview: boolean; // Whether current user can review this profile
  reviews: RelationshipReview[];
  onReviewAdded: () => void;
};

export function RelationshipReviewSection({
  profileUserId,
  profileUserRole,
  profileUserName,
  canReview,
  reviews,
  onReviewAdded,
}: RelationshipReviewSectionProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReviewBack, setCanReviewBack] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    content: '',
    images: [] as ReviewImage[],
    isAnonymous: false,
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

  // Check if current user can review back (profile user reviewed them but they haven't reviewed back)
  useEffect(() => {
    const checkReviewBackStatus = async () => {
      if (!user?.id || !profileUserId || user.id === profileUserId) {
        setCanReviewBack(false);
        return;
      }

      try {
        // Check if profile user has reviewed current user
        const profileUserReviewedMe = reviews.some(
          (review) =>
            review.reviewer_id === profileUserId &&
            ((review.review_type === 'supervisor_reviews_student' &&
              review.student_id === user.id) ||
              (review.review_type === 'student_reviews_supervisor' &&
                review.supervisor_id === user.id)),
        );

        // Check if current user has already reviewed profile user back
        const iHaveReviewedThem = reviews.some(
          (review) =>
            review.reviewer_id === user.id &&
            ((review.review_type === 'supervisor_reviews_student' &&
              review.student_id === profileUserId) ||
              (review.review_type === 'student_reviews_supervisor' &&
                review.supervisor_id === profileUserId)),
        );

        // Can review back if they reviewed me but I haven't reviewed them back
        setCanReviewBack(profileUserReviewedMe && !iHaveReviewedThem && !canReview);
      } catch (error) {
        console.error('Error checking review back status:', error);
        setCanReviewBack(false);
      }
    };

    checkReviewBackStatus();
  }, [user?.id, profileUserId, reviews, canReview]);

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

    if (!newReview.rating) {
      Alert.alert(t('common.error'), 'Please select a rating');
      return;
    }

    // Allow review submission if either canReview or canReviewBack is true
    if (!canReview && !canReviewBack) {
      Alert.alert(t('common.error'), 'You cannot review this user');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload images (optional - certificates, team pics, etc.)
      const uploadedImages = await Promise.all(
        newReview.images.map(async (image) => {
          try {
            const response = await fetch(image.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data.split(',')[1]);
              };
              reader.onerror = () => reject(new Error('Failed to process image'));
              reader.readAsDataURL(blob);
            });

            const fileName = `${Date.now()}-${Math.random()}.jpg`;
            const path = `relationship-review-images/${profileUserId}/${fileName}`;

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
            return null;
          }
        }),
      );

      // Determine review type and relationship IDs
      const reviewType =
        profileUserRole === 'student' ? 'supervisor_reviews_student' : 'student_reviews_supervisor';

      const studentId = profileUserRole === 'student' ? profileUserId : user.id;
      const supervisorId = profileUserRole === 'student' ? user.id : profileUserId;

      // Create relationship review
      const reviewData = {
        student_id: studentId,
        supervisor_id: supervisorId,
        reviewer_id: user.id,
        rating: newReview.rating,
        content: newReview.content,
        review_type: reviewType,
        is_anonymous: newReview.isAnonymous,
      };

      const { error: reviewError } = await supabase.from('relationship_reviews').insert(reviewData);

      if (reviewError) throw reviewError;

      // Create notification for the reviewed user
      try {
        const notificationMessage = newReview.isAnonymous
          ? `Someone left you a ${newReview.rating}-star review`
          : `${user.profile?.full_name || user.email || 'Someone'} left you a ${newReview.rating}-star review`;

        await supabase.from('notifications').insert({
          user_id: profileUserId,
          actor_id: newReview.isAnonymous ? null : user.id,
          type: 'new_message',
          title: 'New Review!',
          message: notificationMessage,
          metadata: {
            notification_subtype: 'relationship_review',
            review_type: reviewType,
            reviewer_id: user.id,
            reviewer_name: newReview.isAnonymous ? 'Anonymous' : user.email || 'Unknown',
            rating: newReview.rating,
            reviewed_user_id: profileUserId,
            reviewed_user_name: profileUserName,
          },
          action_url: `vromm://profile/${profileUserId}`,
          priority: 'normal',
          is_read: false,
        });
      } catch (notificationError) {
        console.warn('Failed to create review notification:', notificationError);
        // Don't fail the review submission for notification errors
      }

      // Reset form and close
      setNewReview({
        rating: 0,
        content: '',
        images: [],
        isAnonymous: false,
      });
      setShowReviewForm(false);
      onReviewAdded();

      Alert.alert(t('common.success'), `Review submitted for ${profileUserName}`);
    } catch (err) {
      console.error('Error submitting relationship review:', err);
      Alert.alert(t('common.error'), 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  // Report review function
  const handleReportReview = async (reviewId: string) => {
    if (!user) return;

    Alert.alert('Report Review', 'Report this review as inappropriate or spam?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('report_review', {
              review_id: reviewId,
              reporter_id: user.id,
            });

            if (error) throw error;

            onReviewAdded(); // Refresh reviews
            Alert.alert(
              'Success',
              'Review reported. Thank you for helping keep our community safe.',
            );
          } catch (err) {
            console.error('Error reporting review:', err);
            Alert.alert('Error', 'Failed to report review');
          }
        },
      },
    ]);
  };

  // Admin delete review function
  const handleAdminDeleteReview = async (reviewId: string) => {
    if (!isAdmin) return;

    Alert.alert(
      'Admin: Delete Review',
      'Are you sure you want to delete this relationship review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('relationship_reviews')
                .delete()
                .eq('id', reviewId);

              if (error) throw error;
              onReviewAdded();
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

  const getReviewerDisplayName = (review: RelationshipReview) => {
    if (review.is_anonymous) {
      return t('routeDetail.anonymous');
    }
    return review.reviewer_profile?.full_name || 'Unknown User';
  };

  const getReviewTypeLabel = (reviewType: string) => {
    switch (reviewType) {
      case 'student_reviews_supervisor':
        return 'Student → Supervisor';
      case 'supervisor_reviews_student':
        return 'Supervisor → Student';
      default:
        return 'Review';
    }
  };

  const getRatingBadge = (averageRating: number, reviewCount: number) => {
    if (reviewCount === 0) return null;

    const badgeColor =
      averageRating >= 4.5
        ? '$green10'
        : averageRating >= 4.0
          ? '$blue10'
          : averageRating >= 3.0
            ? '$orange10'
            : '$red10';

    const badgeText =
      averageRating >= 4.5
        ? 'Excellent'
        : averageRating >= 4.0
          ? 'Very Good'
          : averageRating >= 3.0
            ? 'Good'
            : 'Needs Improvement';

    return (
      <XStack space="$2" alignItems="center">
        <XStack
          space="$1"
          alignItems="center"
          backgroundColor={badgeColor}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Feather name="star" size={14} color="white" />
          <Text size="sm" color="white" weight="medium">
            {averageRating.toFixed(1)}
          </Text>
        </XStack>
        <Text size="sm" color="$gray11">
          {badgeText} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </Text>
      </XStack>
    );
  };

  // Calculate average rating for display
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <Card bordered elevate size="$4" padding="$4">
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack space="$2">
            <Text size="lg" weight="medium" color="$color">
              Reviews for {profileUserName}
            </Text>
            {getRatingBadge(averageRating, reviews.length)}
          </YStack>
          <XStack space="$2">
            {canReview && !showReviewForm && (
              <Button
                onPress={() => setShowReviewForm(true)}
                variant="outlined"
                size="md"
                backgroundColor="$blue10"
                icon={<Feather name="plus" size={18} color="white" />}
              >
                Write Review
              </Button>
            )}
            {canReviewBack && !showReviewForm && (
              <Button
                onPress={() => setShowReviewForm(true)}
                variant="outlined"
                size="md"
                backgroundColor="$green10"
                icon={<Feather name="arrow-left" size={18} color="white" />}
              >
                Review Back
              </Button>
            )}
          </XStack>
        </XStack>

        {showReviewForm ? (
          <Card bordered size="$4" padding="$4">
            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text size="lg" weight="medium" color="$color">
                  Review {profileUserName}
                </Text>
                <Button
                  onPress={() => {
                    setShowReviewForm(false);
                    setNewReview({
                      rating: 0,
                      content: '',
                      images: [],
                      isAnonymous: false,
                    });
                  }}
                  variant="outlined"
                  size="sm"
                  icon={<Feather name="x" size={18} />}
                />
              </XStack>

              {/* Rating Section */}
              <YStack space="$3">
                <Text size="md" weight="medium" color="$color">
                  Overall Rating
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
              </YStack>

              {/* Content Section */}
              <YStack space="$3">
                <Text size="md" weight="medium" color="$color">
                  Your Review
                </Text>
                <TextArea
                  value={newReview.content}
                  onChangeText={(content) => setNewReview((prev) => ({ ...prev, content }))}
                  placeholder={`Share your experience with ${profileUserName}...`}
                  numberOfLines={4}
                  size="$4"
                />
              </YStack>

              {/* Optional Images */}
              <YStack space="$3">
                <Text size="md" weight="medium" color="$color">
                  Photos (Optional)
                </Text>
                <Text size="sm" color="$gray11">
                  Add photos of certificates, team activities, etc.
                </Text>
                <Button
                  onPress={handlePickImages}
                  variant="outlined"
                  size="md"
                  icon={<Feather name="image" size={18} />}
                >
                  Add Photos
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
              </YStack>

              {/* Anonymous Option */}
              <XStack space="$2" alignItems="center">
                <Button
                  size="$3"
                  variant="outlined"
                  backgroundColor={newReview.isAnonymous ? '$blue10' : undefined}
                  onPress={() =>
                    setNewReview((prev) => ({ ...prev, isAnonymous: !prev.isAnonymous }))
                  }
                  icon={<Feather name={newReview.isAnonymous ? 'check' : 'square'} size={16} />}
                />
                <Text size="sm" color="$color">
                  Submit anonymously
                </Text>
              </XStack>

              {/* Submit Button */}
              <Button
                onPress={handleSubmitReview}
                disabled={loading || !newReview.rating}
                variant="outlined"
                size="lg"
                backgroundColor="$green10"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </Button>

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
                No reviews yet. Be the first to review {profileUserName}!
              </Text>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} bordered size="$4" padding="$4">
                  <YStack space="$3">
                    <XStack space="$2" alignItems="center" justifyContent="space-between">
                      <XStack space="$2" alignItems="center">
                        <YStack>
                          <Text weight="medium" color="$color">
                            {getReviewerDisplayName(review)}
                          </Text>
                          <Text size="sm" color="$gray11">
                            {format(new Date(review.created_at), 'MMM d, yyyy')} •{' '}
                            {getReviewTypeLabel(review.review_type)}
                          </Text>
                        </YStack>
                      </XStack>

                      <XStack space="$2">
                        {/* Report button for non-reviewers */}
                        {user && user.id !== review.reviewer_id && (
                          <Button
                            size="$2"
                            variant="outlined"
                            backgroundColor="$orange10"
                            onPress={() => handleReportReview(review.id)}
                          >
                            <Feather name="flag" size={16} color="white" />
                          </Button>
                        )}

                        {/* Admin delete button */}
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
                    </XStack>

                    {/* Star Rating Display */}
                    <XStack space="$1" alignItems="center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Feather
                          key={i}
                          name="star"
                          size={16}
                          color={i < review.rating ? '#FFD700' : '#E5E5E5'}
                        />
                      ))}
                      <Text size="sm" color="$gray11" marginLeft="$2">
                        {review.rating}/5
                      </Text>
                    </XStack>

                    {/* Review Content */}
                    {review.content && <Text color="$color">{review.content}</Text>}
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
