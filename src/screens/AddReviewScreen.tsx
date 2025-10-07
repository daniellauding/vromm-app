import React, { useState } from 'react';
import { YStack, XStack, Image } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { FormField } from '../components/FormField';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Feather } from '@expo/vector-icons';
import { Alert } from 'react-native';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];

type Step = 'rating' | 'content' | 'details';

type Props = {
  route: {
    params: {
      routeId: string;
      returnToRouteDetail?: boolean;
    };
  };
};

export function AddReviewScreen({ route }: Props) {
  const { routeId, returnToRouteDetail } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { language, t } = useTranslation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('rating');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string; fileName: string }[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackPress = () => {
    if (returnToRouteDetail) {
      // Return to HomeScreen with params to reopen RouteDetailSheet
      navigation.navigate('MainTabs', {
        screen: 'HomeTab',
        params: {
          screen: 'HomeScreen',
          params: {
            reopenRouteDetail: true,
            routeId: routeId,
          },
        },
      });
    } else {
      navigation.goBack();
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          fileName: result.assets[0].uri.split('/').pop() || 'image.jpg',
        },
      ]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert(t('review.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          fileName: result.assets[0].uri.split('/').pop() || 'image.jpg',
        },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('review.signInRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!rating) {
        throw new Error(t('review.validationError'));
      }

      // Check if user already has a review for this route
      const { data: existingReview } = await supabase
        .from('route_reviews')
        .select()
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      // Upload images first
      const uploadedImages = [];
      for (const image of images) {
        try {
          console.log('Processing image:', image.fileName);
          const response = await fetch(image.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data.split(',')[1]); // Remove data URL prefix
            };
            reader.onerror = () => reject(new Error(t('review.processingError')));
            reader.readAsDataURL(blob);
          });

          const ext = image.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
          const path = `review-images/${routeId}/${Date.now()}-${Math.random()}.${ext}`;

          console.log('Uploading image to path:', path);
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('review-images')
            .upload(path, decode(base64), {
              contentType: `image/${ext}`,
              upsert: true,
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw uploadError;
          }

          console.log('Image uploaded successfully');
          const {
            data: { publicUrl },
          } = supabase.storage.from('review-images').getPublicUrl(path);

          uploadedImages.push({
            url: publicUrl,
            description: '',
          });
        } catch (imageError) {
          console.error('Error processing image:', imageError);
          throw new Error(t('review.processingError'));
        }
      }

      const reviewData = {
        route_id: routeId,
        user_id: user.id,
        rating,
        content,
        difficulty,
        visited_at: visitDate,
        images: uploadedImages,
      };

      let result;

      if (existingReview) {
        // Update existing review
        console.log('Updating existing review');
        result = await supabase
          .from('route_reviews')
          .update(reviewData)
          .eq('route_id', routeId)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new review
        console.log('Creating new review');
        result = await supabase.from('route_reviews').insert(reviewData).select().single();
      }

      if (result.error) {
        console.error('Review operation error:', result.error);
        throw result.error;
      }

      console.log('Review operation successful:', result.data);

      // Mark route as driven (if not already)
      const { error: drivenError } = await supabase.from('driven_routes').upsert({
        route_id: routeId,
        user_id: user.id,
        driven_at: visitDate,
      });

      if (drivenError) {
        console.error('Driven route error:', drivenError);
        throw drivenError;
      }

      try {
        // Notify route creator that route was completed (in-app + push), best-effort
        if (user?.id) {
          const { data: routeRow } = await supabase
            .from('routes')
            .select('id, name, creator_id')
            .eq('id', routeId)
            .single();
          if (routeRow?.creator_id && routeRow.creator_id !== user.id) {
            const { pushNotificationService } = await import('../services/pushNotificationService');
            await pushNotificationService.sendRouteCompletedNotification(
              routeId,
              routeRow.name || 'Route',
              user.id,
              (user as any)?.full_name || (user as any)?.email || 'Someone',
              routeRow.creator_id,
            );
          }
        }
      } catch (notifyError) {
        console.log('Route completion notification failed (best-effort):', notifyError);
      }

      // Navigate back and ensure reviews are refreshed immediately
      if (returnToRouteDetail) {
        // Return to HomeScreen with params to reopen RouteDetailSheet
        navigation.navigate('MainTabs', {
          screen: 'HomeTab',
          params: {
            screen: 'HomeScreen',
            params: {
              reopenRouteDetail: true,
              routeId: routeId,
            },
          },
        });
      } else {
        navigation.navigate('RouteDetail', { routeId, shouldRefreshReviews: true });
      }
    } catch (err) {
      console.error('Submit review error:', err);
      setError(err instanceof Error ? err.message : t('review.uploadError'));
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('review.uploadError'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'rating':
        return (
          <YStack gap="$4" alignItems="center">
            <Text size="xl" weight="bold">
              {t('review.ratingStep')}
            </Text>
            <XStack gap="$2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  onPress={() => setRating(star)}
                  backgroundColor={star <= rating ? '$blue10' : 'transparent'}
                  borderColor="$blue10"
                  borderWidth={1}
                  size="lg"
                >
                  <Feather name="star" size={24} color={star <= rating ? 'white' : '#4287f5'} />
                </Button>
              ))}
            </XStack>
            <Button
              onPress={() => setCurrentStep('content')}
              disabled={rating === 0}
              variant="primary"
              size="lg"
              backgroundColor="$blue10"
            >
              {t('review.ratingNext')}
            </Button>
          </YStack>
        );

      case 'content':
        return (
          <YStack gap="$4">
            <Text size="xl" weight="bold">
              {t('review.contentStep')}
            </Text>
            <FormField
              label={t('review.reviewLabel')}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              placeholder={t('review.reviewPlaceholder')}
            />
            <XStack gap="$2" flexWrap="wrap">
              {images.map((image, index) => (
                <XStack
                  key={index}
                  width={100}
                  height={100}
                  backgroundColor="$gray5"
                  borderRadius="$2"
                  overflow="hidden"
                  position="relative"
                >
                  <Image
                    source={{ uri: image.uri }}
                    width="100%"
                    height="100%"
                    resizeMode="cover"
                  />
                  <Button
                    position="absolute"
                    top={4}
                    right={4}
                    size="sm"
                    backgroundColor="$red10"
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Feather name="x" size={16} color="white" />
                  </Button>
                </XStack>
              ))}
              {images.length < 5 && (
                <XStack gap="$2">
                  <Button onPress={handlePickImage} backgroundColor="$blue10" size="lg">
                    <XStack gap="$2" alignItems="center">
                      <Feather name="image" size={20} color="white" />
                      <Text color="white">{t('review.addPhoto')}</Text>
                    </XStack>
                  </Button>
                  <Button onPress={handleTakePhoto} backgroundColor="$blue10" size="lg">
                    <XStack gap="$2" alignItems="center">
                      <Feather name="camera" size={20} color="white" />
                      <Text color="white">{t('review.takePhoto')}</Text>
                    </XStack>
                  </Button>
                </XStack>
              )}
            </XStack>
            <XStack gap="$2">
              <Button
                onPress={() => setCurrentStep('rating')}
                variant="secondary"
                size="lg"
                flex={1}
              >
                {t('review.back')}
              </Button>
              <Button
                onPress={() => setCurrentStep('details')}
                variant="primary"
                size="lg"
                backgroundColor="$blue10"
                flex={1}
              >
                {t('review.ratingNext')}
              </Button>
            </XStack>
          </YStack>
        );

      case 'details':
        return (
          <YStack gap="$4">
            <Text size="xl" weight="bold">
              {t('review.detailsStep')}
            </Text>
            <YStack gap="$2">
              <Text size="lg" weight="medium">
                {t('review.difficultyLevel')}
              </Text>
              <XStack gap="$2">
                {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map((level) => (
                  <Button
                    key={level}
                    onPress={() => setDifficulty(level)}
                    backgroundColor={difficulty === level ? '$blue10' : 'transparent'}
                    borderColor="$blue10"
                    borderWidth={1}
                    flex={1}
                  >
                    <Text
                      color={difficulty === level ? 'white' : '$blue10'}
                      textTransform="capitalize"
                    >
                      {level === 'beginner'
                        ? t('profile.experienceLevels.beginner')
                        : level === 'intermediate'
                          ? t('profile.experienceLevels.intermediate')
                          : t('profile.experienceLevels.advanced')}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </YStack>
            <FormField
              label={t('review.visitDate')}
              value={new Date(visitDate).toLocaleDateString()}
              onPress={() => {
                // You might want to add a date picker here
              }}
            />
            <XStack gap="$2">
              <Button
                onPress={() => setCurrentStep('content')}
                variant="secondary"
                size="lg"
                flex={1}
              >
                {t('review.back')}
              </Button>
              <Button
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                backgroundColor="$blue10"
                flex={1}
                disabled={loading}
              >
                {loading ? t('review.submitting') : t('review.submit')}
              </Button>
            </XStack>
          </YStack>
        );
    }
  };

  return (
    <Screen>
      <YStack f={1} gap="$4">
        <Header title={t('review.title')} showBack onBackPress={handleBackPress} />

        {error ? (
          <Text size="sm" color="$red10" textAlign="center">
            {error}
          </Text>
        ) : null}

        {renderStep()}
      </YStack>
    </Screen>
  );
}
