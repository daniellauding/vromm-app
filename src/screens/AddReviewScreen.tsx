import React, { useState } from 'react';
import { YStack, XStack, Image, Card, TextArea } from 'tamagui';
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
import { Alert, TouchableOpacity, ScrollView, StyleSheet, View } from 'react-native';
import { useThemePreference } from '../hooks/useThemeOverride';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];

type Step = 'rating' | 'content' | 'details';

type Props = {
  route: {
    params: {
      routeId: string;
      returnToRouteDetail?: boolean;
    };
  };
  onReviewComplete?: () => void;
  embeddedInSheet?: boolean; // When true, skip Screen/Header wrapper
};

export function AddReviewScreen({ route, onReviewComplete, embeddedInSheet = false }: Props) {
  const { routeId, returnToRouteDetail } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { language, t } = useTranslation();
  const { user } = useAuth();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

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
      // Use upsert with onConflict to handle the unique constraint on (user_id, route_id)
      const { error: drivenError } = await supabase
        .from('driven_routes')
        .upsert(
          {
            route_id: routeId,
            user_id: user.id,
            driven_at: visitDate,
          },
          {
            onConflict: 'user_id,route_id',
          }
        );

      if (drivenError) {
        console.error('Driven route error:', drivenError);
        // If it's a duplicate key error, it means the route is already marked as driven
        // This is fine - we can just continue
        if (drivenError.code !== '23505') {
          throw drivenError;
        } else {
          console.log('Route already marked as driven, continuing...');
        }
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

      // Call onReviewComplete callback if provided (for sheet mode)
      if (onReviewComplete) {
        onReviewComplete();
        return;
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
          <YStack gap="$4" paddingHorizontal="$4">
            <Card backgroundColor={backgroundColor} borderWidth={1} borderColor={borderColor} padding="$5" borderRadius={16}>
              <YStack gap="$4" alignItems="center">
                <Text fontSize={24} fontWeight="900" fontStyle="italic" color={textColor} textAlign="center">
                  {t('review.ratingStep') || 'How was your experience?'}
                </Text>
                <XStack gap="$3" justifyContent="center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <Feather 
                        name="star" 
                        size={36} 
                        color={star <= rating ? '#FFD700' : borderColor}
                        fill={star <= rating ? '#FFD700' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </XStack>
              </YStack>
            </Card>
            
            <YStack gap="$2">
              <Button
                onPress={() => setCurrentStep('content')}
                disabled={rating === 0}
                variant="primary"
                size="md"
              >
                {t('common.next') || 'Next'}
              </Button>
              <Button
                onPress={handleBackPress}
                variant="link"
                size="md"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            </YStack>
          </YStack>
        );

      case 'content':
        return (
          <YStack gap="$4" paddingHorizontal="$4">
            <Card backgroundColor={backgroundColor} borderWidth={1} borderColor={borderColor} padding="$5" borderRadius={16}>
              <YStack gap="$4">
                <Text fontSize={24} fontWeight="900" fontStyle="italic" color={textColor} textAlign="center">
                  {t('review.contentStep') || 'Tell us about your experience'}
                </Text>
                
                <TextArea
                  value={content}
                  onChangeText={setContent}
                  placeholder={t('review.reviewPlaceholder') || 'Share your thoughts...'}
                  numberOfLines={6}
                  style={{
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 12,
                    color: textColor,
                    padding: 12,
                  }}
                />
                
                <YStack gap="$3">
                  <Text fontSize={16} fontWeight="600" color={textColor}>
                    {t('review.addPhotos') || 'Add Photos (Optional)'}
                  </Text>
                  
                  <XStack gap="$2" flexWrap="wrap">
                    {images.map((image, index) => (
                      <TouchableOpacity
                        key={index}
                        style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden' }}
                      >
                        <Image
                          source={{ uri: image.uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderRadius: 15,
                            width: 30,
                            height: 30,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="x" size={16} color="white" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    
                    {images.length < 5 && (
                      <XStack gap="$2">
                        <TouchableOpacity
                          onPress={handlePickImage}
                          style={{
                            width: 100,
                            height: 100,
                            backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: borderColor,
                            borderStyle: 'dashed',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="image" size={24} color={textColor} opacity={0.5} />
                          <Text fontSize={10} color={textColor} opacity={0.5} marginTop={4}>
                            {t('review.addPhoto') || 'Gallery'}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={handleTakePhoto}
                          style={{
                            width: 100,
                            height: 100,
                            backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: borderColor,
                            borderStyle: 'dashed',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="camera" size={24} color={textColor} opacity={0.5} />
                          <Text fontSize={10} color={textColor} opacity={0.5} marginTop={4}>
                            {t('review.takePhoto') || 'Camera'}
                          </Text>
                        </TouchableOpacity>
                      </XStack>
                    )}
                  </XStack>
                </YStack>
              </YStack>
            </Card>
            
            <YStack gap="$2">
              <Button
                onPress={() => setCurrentStep('details')}
                variant="primary"
                size="md"
              >
                {t('common.next') || 'Next'}
              </Button>
              <Button
                onPress={() => setCurrentStep('rating')}
                variant="link"
                size="md"
              >
                {t('common.back') || 'Back'}
              </Button>
            </YStack>
          </YStack>
        );

      case 'details':
        return (
          <YStack gap="$4" paddingHorizontal="$4">
            <Card backgroundColor={backgroundColor} borderWidth={1} borderColor={borderColor} padding="$5" borderRadius={16}>
              <YStack gap="$4">
                <Text fontSize={24} fontWeight="900" fontStyle="italic" color={textColor} textAlign="center">
                  {t('review.detailsStep') || 'How difficult was it?'}
                </Text>
                
                <YStack gap="$3">
                  <Text fontSize={18} fontWeight="600" color={textColor}>
                    {t('review.difficultyLevel') || 'Difficulty Level'}
                  </Text>
                  
                  <XStack gap="$2" flexWrap="wrap">
                    {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map((level) => {
                      const isSelected = difficulty === level;
                      return (
                        <TouchableOpacity
                          key={level}
                          onPress={() => setDifficulty(level)}
                          style={[
                            styles.filterChip,
                            {
                              borderColor,
                              backgroundColor: isSelected ? '#27febe' : 'transparent',
                              flex: 1,
                              alignItems: 'center',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isSelected ? '#000000' : textColor,
                                fontWeight: isSelected ? '600' : '500',
                              },
                            ]}
                          >
                            {level === 'beginner'
                              ? t('profile.experienceLevels.beginner') || 'Beginner'
                              : level === 'intermediate'
                                ? t('profile.experienceLevels.intermediate') || 'Intermediate'
                                : t('profile.experienceLevels.advanced') || 'Advanced'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </XStack>
                </YStack>
              </YStack>
            </Card>
            
            <YStack gap="$2">
              <Button
                onPress={handleSubmit}
                variant="primary"
                size="md"
                disabled={loading}
              >
                {loading ? (t('review.submitting') || 'Submitting...') : (t('review.submit') || 'Submit Review')}
              </Button>
              <Button
                onPress={() => setCurrentStep('content')}
                variant="link"
                size="md"
              >
                {t('common.back') || 'Back'}
              </Button>
            </YStack>
          </YStack>
        );
    }
  };

  const styles = StyleSheet.create({
    filterChip: {
      marginRight: 8,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    starButton: {
      padding: 8,
    },
  });

  const reviewContent = (
    <YStack f={1} gap="$4" backgroundColor={backgroundColor}>
      {!embeddedInSheet && (
        <Header 
          title={t('review.title') || 'Add Review'} 
          showBack 
          onBackPress={handleBackPress}
        />
      )}

        {/* Progress Indicator */}
        <XStack gap="$2" paddingHorizontal="$4" justifyContent="center">
          {['rating', 'content', 'details'].map((step, index) => (
            <View
              key={step}
              style={{
                flex: 1,
                height: 4,
                backgroundColor:
                  step === currentStep ||
                  (currentStep === 'content' && step === 'rating') ||
                  (currentStep === 'details' && (step === 'rating' || step === 'content'))
                    ? '#00E6C3'
                    : borderColor,
                borderRadius: 2,
              }}
            />
          ))}
        </XStack>

        {error ? (
          <Card backgroundColor="rgba(239, 68, 68, 0.1)" padding="$3" marginHorizontal="$4" borderRadius={12}>
            <Text fontSize={14} color="#EF4444" textAlign="center">
              {error}
            </Text>
          </Card>
        ) : null}

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </YStack>
  );

  if (embeddedInSheet) {
    return reviewContent;
  }

  return (
    <Screen>
      {reviewContent}
    </Screen>
  );
}
