import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TouchableOpacity,
  Alert,
  Animated,
  Pressable,
  Dimensions,
  Modal,
  View,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
import { RouteListSheet } from '../../components/RouteListSheet';
import { RouteDetailSheet } from '../../components/RouteDetailSheet';
import { ActionSheet } from '../../components/ActionSheet';
import { IconButton } from '../../components/IconButton';
import { FormField } from '../../components/FormField';

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 4,
    paddingVertical: 16,
    paddingBottom: 70 + BOTTOM_INSET,
  },
});

interface DailyStatusData {
  id?: string;
  status: 'drove' | 'didnt_drive' | null; // Allow null for no selection
  how_it_went?: string;
  challenges?: string;
  notes?: string;
  driving_time_minutes?: number;
  distance_km?: number;
  rating?: number; // 1-5 scale
  media_uri?: string; // Image or video URI
  media_type?: 'image' | 'video'; // Type of media
}

interface DailyStatusProps {
  activeUserId?: string;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function DailyStatus({
  activeUserId,
  selectedDate: externalSelectedDate,
  onDateChange,
}: DailyStatusProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { language: lang, t, refreshTranslations } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme || 'light';

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const gradientRotation = useRef(new Animated.Value(0)).current;

  const effectiveUserId = activeUserId || profile?.id;

  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<DailyStatusData | null>(null);
  const [formData, setFormData] = useState<DailyStatusData>({
    status: null, // No preselection - user must choose
    how_it_went: '',
    challenges: '',
    notes: '',
    driving_time_minutes: 0,
    distance_km: 0,
    rating: 3,
    media_uri: undefined,
    media_type: undefined,
  });

  // Track selected exercises for the day with more detailed info (including repeat info)
  const [selectedExercises, setSelectedExercises] = useState<
    Array<{
      id: string;
      title: string;
      learningPathId?: string;
      learningPathTitle?: string;
      repeatNumber?: number;
    }>
  >([]);

  // Inline error message for status validation
  const [statusError, setStatusError] = useState('');

  // Date navigation state - use external date if provided
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  const selectedDate = externalSelectedDate || internalSelectedDate;
  const [pastStatuses, setPastStatuses] = useState<{ [key: string]: DailyStatusData | null }>({});

  // Learning content sheet states
  const [showLearningPathsSheet, setShowLearningPathsSheet] = useState(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = useState<any | null>(null);
  const [cameFromDailyStatus, setCameFromDailyStatus] = useState(false);

  // Route integration sheet states
  const [showRouteListSheet, setShowRouteListSheet] = useState(false);
  const [routeCameFromDailyStatus, setRouteCameFromDailyStatus] = useState(false);

  // Route detail sheet state
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Action sheet state
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Sheet snap points and gesture handling
  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = useMemo(
    () => ({
      large: screenHeight * 0.1, // Show 90% of sheet
      medium: screenHeight * 0.4, // Show 60% of sheet
      small: screenHeight * 0.7, // Show 30% of sheet
      dismissed: screenHeight, // Completely hidden
    }),
    [screenHeight],
  );

  const sheetTranslateY = useSharedValue(screenHeight);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);

  // Update internal date when external date changes
  useEffect(() => {
    if (externalSelectedDate) {
      setInternalSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  // Load status for selected date
  const loadStatusForDate = async (date: Date) => {
    if (!effectiveUserId) {
      console.log('⚠️ [DailyStatus] No user ID, skipping load');
      return;
    }

    const dateString = date.toISOString().split('T')[0];
    console.log('📅 [DailyStatus] Loading status for date:', dateString);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_status')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('date', dateString)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('❌ [DailyStatus] Error loading daily status:', error);
        return;
      }

      if (data) {
        console.log('✅ [DailyStatus] Status found for', dateString, ':', {
          status: data.status,
          how_it_went: data.how_it_went,
          challenges: data.challenges,
          notes: data.notes,
          driving_time_minutes: data.driving_time_minutes,
          distance_km: data.distance_km,
          rating: data.rating,
        });
        setPastStatuses((prev) => ({ ...prev, [dateString]: data }));
        if (dateString === todayString) {
          setTodayStatus(data);
          console.log('✅ [DailyStatus] Updated todayStatus');
        }
        setFormData({
          status: data.status as 'drove' | 'didnt_drive',
          how_it_went: data.how_it_went || '',
          challenges: data.challenges || '',
          notes: data.notes || '',
          driving_time_minutes: data.driving_time_minutes || 0,
          distance_km: data.distance_km || 0,
          rating: data.rating || 3,
          media_uri: (data as any).media_uri,
          media_type: (data as any).media_type,
        });
        console.log('✅ [DailyStatus] Form data populated from DB');
      } else {
        console.log('📭 [DailyStatus] No status found for', dateString);
        setPastStatuses((prev) => ({ ...prev, [dateString]: null }));
        if (dateString === todayString) {
          setTodayStatus(null);
          console.log('✅ [DailyStatus] Cleared todayStatus');
        }
        setFormData({
          status: null, // No preselection when no data
          how_it_went: '',
          challenges: '',
          notes: '',
          driving_time_minutes: 0,
          distance_km: 0,
          rating: 3,
          media_uri: undefined,
          media_type: undefined,
        });
        console.log('✅ [DailyStatus] Form data cleared (no status)');
      }
    } catch (error) {
      console.error('❌ [DailyStatus] Exception loading daily status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load today's status (alias for backward compatibility)
  const loadTodayStatus = () => loadStatusForDate(today);

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    if (!externalSelectedDate) {
      setInternalSelectedDate(newDate);
    }
    if (onDateChange) {
      onDateChange(newDate);
    }
    loadStatusForDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (!externalSelectedDate) {
      setInternalSelectedDate(newDate);
    }
    if (onDateChange) {
      onDateChange(newDate);
    }
    loadStatusForDate(newDate);
  };

  const goToToday = () => {
    if (!externalSelectedDate) {
      setInternalSelectedDate(today);
    }
    if (onDateChange) {
      onDateChange(today);
    }
    loadStatusForDate(today);
  };

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isFuture = selectedDate > today;

  // Route navigation helper functions
  const handleNavigateToMap = () => {
    console.log('🗺️ [DailyStatus] Navigating to MapScreen from DailyStatus modal');

    // Hide DailyStatus modal first
    setShowSheet(false);

    // Navigate to MapTab after smooth transition
    setTimeout(() => {
      (navigation as any).navigate('MainTabs', {
        screen: 'MapTab',
        params: {
          screen: 'MapScreen',
          params: {
            fromDailyStatus: true,
            selectedDate: selectedDate.toISOString(),
          },
        },
      });
    }, 200);
  };

  const handleOpenRouteList = () => {
    console.log('📋 [DailyStatus] Opening RouteListSheet from DailyStatus modal');

    // Hide DailyStatus modal first
    setShowSheet(false);

    // Set flag to remember we came from DailyStatus
    setRouteCameFromDailyStatus(true);

    // Show RouteListSheet after a brief delay for smooth transition
    setTimeout(() => {
      setShowRouteListSheet(true);
    }, 200);
  };

  const handleOpenActionSheet = () => {
    console.log('⚡ [DailyStatus] Opening ActionSheet from DailyStatus modal');

    // Hide DailyStatus modal first
    setShowSheet(false);

    // Show ActionSheet after a brief delay for smooth transition
    setTimeout(() => {
      setShowActionSheet(true);
    }, 200);
  };

  const handleRoutePress = (routeId: string) => {
    console.log('🗺️ [DailyStatus] Route pressed, opening RouteDetailSheet:', routeId);

    // Close RouteListSheet first
    setShowRouteListSheet(false);
    setRouteCameFromDailyStatus(false);

    // Set selected route and show RouteDetailSheet
    setSelectedRouteId(routeId);
    setTimeout(() => {
      setShowRouteDetailSheet(true);
    }, 200);
  };

  // Simplified media picker - works like CreateRouteSheet
  const handleAddMedia = async () => {
    try {
      console.log('📸 [DailyStatus] Add media button pressed');

      // Show action sheet with options (iOS native action sheet)
      Alert.alert(
        t('dailyStatus.addMemory') || 'Add Memory',
        t('dailyStatus.chooseMediaSource') || 'Choose how to add your photo or video',
        [
          {
            text: t('dailyStatus.chooseFromLibrary') || 'Choose from Library',
            onPress: async () => {
              try {
                console.log('📚 [DailyStatus] Choose from Library selected');

                // Request permissions
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                console.log('📚 [DailyStatus] Library permission:', permissionResult.status);

                if (permissionResult.status !== 'granted') {
                  showToast({
                    title: t('common.permissionRequired') || 'Permission Required',
                    message:
                      t('dailyStatus.libraryPermissionRequired') ||
                      'Library permission is required to choose media',
                    type: 'error',
                  });
                  return;
                }

                // Launch picker with both photo and video options
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.All,
                  allowsEditing: true,
                  quality: 0.8,
                  videoMaxDuration: 60,
                });

                console.log('📚 [DailyStatus] Library result:', result);

                if (!result.canceled && result.assets[0]) {
                  const asset = result.assets[0];
                  const mediaType = asset.type === 'video' ? 'video' : 'image';

                  setFormData((prev) => ({
                    ...prev,
                    media_uri: asset.uri,
                    media_type: mediaType,
                  }));

                  showToast({
                    title: t('dailyStatus.mediaAdded') || 'Media Added',
                    message:
                      t('dailyStatus.mediaAddedMessage')?.replace(
                        '{mediaType}',
                        mediaType === 'video'
                          ? t('dailyStatus.video') || 'Video'
                          : t('dailyStatus.photo') || 'Photo',
                      ) ||
                      `${mediaType === 'video' ? 'Video' : 'Photo'} added to your daily memory`,
                    type: 'success',
                  });
                }
              } catch (error) {
                console.error('❌ [DailyStatus] Library error:', error);
                showToast({
                  title: t('common.error') || 'Error',
                  message: t('dailyStatus.failedToAccessLibrary') || 'Failed to access library',
                  type: 'error',
                });
              }
            },
          },
          {
            text: t('dailyStatus.takePhoto') || 'Take Photo',
            onPress: async () => {
              try {
                console.log('📸 [DailyStatus] Take Photo selected');

                // Request camera permissions - this will fail gracefully if camera is not available
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                console.log('📸 [DailyStatus] Camera permission:', permissionResult.status);

                if (permissionResult.status !== 'granted') {
                  showToast({
                    title: t('common.permissionRequired') || 'Permission Required',
                    message:
                      t('dailyStatus.cameraPermissionRequiredPhoto') ||
                      'Camera permission is required to take photos',
                    type: 'error',
                  });
                  return;
                }

                // Launch camera
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });

                console.log('📸 [DailyStatus] Camera result:', result);

                if (!result.canceled && result.assets[0]) {
                  setFormData((prev) => ({
                    ...prev,
                    media_uri: result.assets[0].uri,
                    media_type: 'image',
                  }));

                  showToast({
                    title: t('dailyStatus.photoAdded') || 'Photo Added',
                    message:
                      t('dailyStatus.photoAddedMessage') || 'Photo added to your daily memory',
                    type: 'success',
                  });
                }
              } catch (error: any) {
                console.error('❌ [DailyStatus] Camera error:', error);
                const errorMessage = error?.message?.toLowerCase().includes('camera')
                  ? t('dailyStatus.cameraNotAvailable') || 'Camera is not available on this device'
                  : t('dailyStatus.failedToTakePhoto') || 'Failed to take photo';
                showToast({
                  title: t('dailyStatus.cameraError') || 'Camera Error',
                  message: errorMessage,
                  type: 'error',
                });
              }
            },
          },
          {
            text: t('dailyStatus.recordVideo') || 'Record Video',
            onPress: async () => {
              try {
                console.log('🎥 [DailyStatus] Record Video selected');

                // Request camera permissions - this will fail gracefully if camera is not available
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                console.log('🎥 [DailyStatus] Camera permission:', permissionResult.status);

                if (permissionResult.status !== 'granted') {
                  showToast({
                    title: t('common.permissionRequired') || 'Permission Required',
                    message:
                      t('dailyStatus.cameraPermissionRequiredVideo') ||
                      'Camera permission is required to record videos',
                    type: 'error',
                  });
                  return;
                }

                // Launch camera for video
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                  allowsEditing: true,
                  quality: 0.8,
                  videoMaxDuration: 60,
                });

                console.log('🎥 [DailyStatus] Video result:', result);

                if (!result.canceled && result.assets[0]) {
                  setFormData((prev) => ({
                    ...prev,
                    media_uri: result.assets[0].uri,
                    media_type: 'video',
                  }));

                  showToast({
                    title: t('dailyStatus.videoAdded') || 'Video Added',
                    message:
                      t('dailyStatus.videoAddedMessage') || 'Video added to your daily memory',
                    type: 'success',
                  });
                }
              } catch (error: any) {
                console.error('❌ [DailyStatus] Video error:', error);
                const errorMessage = error?.message?.toLowerCase().includes('camera')
                  ? t('dailyStatus.cameraNotAvailable') || 'Camera is not available on this device'
                  : t('dailyStatus.failedToRecordVideo') || 'Failed to record video';
                showToast({
                  title: t('dailyStatus.cameraError') || 'Camera Error',
                  message: errorMessage,
                  type: 'error',
                });
              }
            },
          },
          {
            text: t('common.cancel') || 'Cancel',
            style: 'cancel',
            onPress: () => console.log('📸 [DailyStatus] Media picker cancelled'),
          },
        ],
        { cancelable: true },
      );
    } catch (error) {
      console.error('❌ [DailyStatus] Error showing media options:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('dailyStatus.failedToShowMediaOptions') || 'Failed to show media options',
        type: 'error',
      });
    }
  };

  const handleRemoveMedia = () => {
    console.log('🗑️ [DailyStatus] Removing media');
    setFormData((prev) => ({
      ...prev,
      media_uri: undefined,
      media_type: undefined,
    }));
    showToast({
      title: t('dailyStatus.mediaRemoved') || 'Media Removed',
      message: t('dailyStatus.mediaRemovedMessage') || 'Media removed from your daily memory',
      type: 'info',
    });
  };

  // Upload media to Supabase Storage
  const uploadMediaToStorage = async (
    uri: string,
    type: 'image' | 'video',
  ): Promise<string | null> => {
    try {
      if (!effectiveUserId) return null;

      console.log('📤 [DailyStatus] Uploading media to Supabase Storage:', { uri, type });

      // Generate unique filename
      const fileExt = type === 'image' ? 'jpg' : 'mp4';
      const fileName = `${effectiveUserId}/${Date.now()}.${fileExt}`;
      const filePath = `daily-status/${fileName}`;

      console.log('📤 [DailyStatus] File path:', filePath);

      // Read file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📤 [DailyStatus] File size:', base64.length, 'base64 chars');

      // Convert base64 to ArrayBuffer for Supabase
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('📤 [DailyStatus] Converted to bytes:', bytes.length, 'bytes');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from('media').upload(filePath, bytes, {
        contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
        upsert: false,
      });

      if (error) {
        console.error('❌ [DailyStatus] Storage upload error:', error);
        throw error;
      }

      console.log('✅ [DailyStatus] Upload successful:', data);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('media').getPublicUrl(filePath);

      console.log('✅ [DailyStatus] Public URL:', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('❌ [DailyStatus] Error uploading media:', error);
      showToast({
        title: t('dailyStatus.uploadFailed') || 'Upload Failed',
        message:
          t('dailyStatus.failedToUploadMedia') || 'Failed to upload media. Please try again.',
        type: 'error',
      });
      return null;
    }
  };

  // Reset daily status for selected date
  const resetDailyStatus = async () => {
    if (!effectiveUserId) {
      console.log('⚠️ [DailyStatus] Reset: No user ID');
      return;
    }

    // Don't allow resetting for future dates
    if (isFuture) {
      console.log('⚠️ [DailyStatus] Reset: Cannot reset future date');
      showToast({
        title: t('dailyStatus.cannotReset') || 'Cannot Reset',
        message: t('dailyStatus.nothingToResetFuture') || 'Nothing to reset for future dates!',
        type: 'info',
      });
      return;
    }

    const dateString = selectedDate.toISOString().split('T')[0];
    const hasExistingStatus = pastStatuses[dateString];
    console.log(
      '🔄 [DailyStatus] Reset requested for',
      dateString,
      '- Has existing:',
      !!hasExistingStatus,
    );

    if (!hasExistingStatus) {
      // Just clear the form if no saved status
      console.log('🧹 [DailyStatus] Clearing form (no saved status)');
      setFormData({
        status: null, // No preselection
        how_it_went: '',
        challenges: '',
        notes: '',
        driving_time_minutes: 0,
        distance_km: 0,
        rating: 3,
        media_uri: undefined,
        media_type: undefined,
      });
      setSelectedExercises([]);
      setStatusError('');
      showToast({
        title: t('dailyStatus.formCleared') || 'Form Cleared',
        message: t('dailyStatus.formHasBeenReset') || 'Form has been reset',
        type: 'info',
      });
      return;
    }

    // Confirm deletion if status exists
    Alert.alert(
      t('dailyStatus.resetStatus') || 'Reset Status',
      t('dailyStatus.confirmDeleteStatus') ||
        'Are you sure you want to delete this status? This cannot be undone.',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
          onPress: () => console.log('🚫 [DailyStatus] Reset cancelled by user'),
        },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ [DailyStatus] Deleting status from DB for', dateString);
            try {
              setLoading(true);
              const { error } = await supabase
                .from('daily_status')
                .delete()
                .eq('user_id', effectiveUserId)
                .eq('date', dateString);

              if (error) {
                console.error('❌ [DailyStatus] Error deleting daily status:', error);
                Alert.alert(
                  t('common.error') || 'Error',
                  t('dailyStatus.failedToDeleteStatus') ||
                    'Failed to delete status. Please try again.',
                );
                return;
              }

              console.log('✅ [DailyStatus] Status deleted from DB');

              // Clear the form and status
              setFormData({
                status: null, // No preselection
                how_it_went: '',
                challenges: '',
                notes: '',
                driving_time_minutes: 0,
                distance_km: 0,
                rating: 3,
                media_uri: undefined,
                media_type: undefined,
              });
              setSelectedExercises([]);
              setStatusError('');
              setPastStatuses((prev) => ({ ...prev, [dateString]: null }));
              if (isToday) {
                setTodayStatus(null);
              }

              console.log('✅ [DailyStatus] Local state cleared');

              showToast({
                title: t('dailyStatus.statusDeleted') || 'Status Deleted',
                message: t('dailyStatus.yourStatusHasBeenReset') || 'Your status has been reset',
                type: 'success',
              });
            } catch (error) {
              console.error('❌ [DailyStatus] Exception deleting daily status:', error);
              Alert.alert(
                t('common.error') || 'Error',
                t('dailyStatus.failedToDeleteStatus') ||
                  'Failed to delete status. Please try again.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // Save daily status
  const saveDailyStatus = async () => {
    if (!effectiveUserId) {
      console.log('⚠️ [DailyStatus] Save: No user ID');
      return;
    }

    // Don't allow saving for future dates
    if (isFuture) {
      console.log('⚠️ [DailyStatus] Save: Cannot save future date');
      showToast({
        title: t('dailyStatus.cannotSave') || 'Cannot Save',
        message:
          t('dailyStatus.comeBackOnThisDay') || 'Come back on this day to share your status!',
        type: 'info',
      });
      return;
    }

    // Require status selection
    if (!formData.status) {
      console.log('⚠️ [DailyStatus] Save: No status selected');
      setStatusError(
        t('dailyStatus.pleaseSelectStatus') || 'Please select whether you drove or not',
      );
      showToast({
        title: t('dailyStatus.statusRequired') || 'Status Required',
        message:
          t('dailyStatus.pleaseSelectStatusBeforeSaving') ||
          'Please select whether you drove or not before saving',
        type: 'error',
      });
      return;
    }

    // Clear status error if validation passes
    setStatusError('');

    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      // Upload media to storage if present
      let mediaUrl = formData.media_uri;
      if (formData.media_uri && formData.media_uri.startsWith('file://')) {
        console.log('📤 [DailyStatus] Uploading local media to storage...');
        const uploadedUrl = await uploadMediaToStorage(
          formData.media_uri,
          formData.media_type || 'image',
        );
        if (uploadedUrl) {
          mediaUrl = uploadedUrl;
          console.log('✅ [DailyStatus] Media uploaded successfully:', uploadedUrl);
        } else {
          console.log('⚠️ [DailyStatus] Media upload failed, continuing without media');
          mediaUrl = undefined;
        }
      }

      const dataToSave = {
        user_id: effectiveUserId,
        date: dateString,
        status: formData.status,
        how_it_went: formData.how_it_went || null,
        challenges: formData.challenges || null,
        notes: formData.notes || null,
        driving_time_minutes: formData.driving_time_minutes || null,
        distance_km: formData.distance_km || null,
        rating: formData.rating || null,
        media_uri: mediaUrl || null,
        media_type: mediaUrl ? formData.media_type : null,
      };

      console.log('💾 [DailyStatus] Saving status for', dateString, ':', dataToSave);

      const { data, error } = await supabase
        .from('daily_status')
        .upsert(dataToSave, {
          onConflict: 'user_id,date',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [DailyStatus] Error saving daily status:', error);
        Alert.alert(
          t('common.error') || 'Error',
          t('dailyStatus.failedToSaveStatus') || 'Failed to save your status. Please try again.',
        );
        return;
      }

      console.log('✅ [DailyStatus] Status saved to DB:', data);

      // Update the status in our state
      setPastStatuses((prev) => ({ ...prev, [dateString]: data }));
      if (isToday) {
        setTodayStatus(data);
        console.log('✅ [DailyStatus] Updated todayStatus with saved data');
      }

      // Update form data with the uploaded media URL
      if (mediaUrl && mediaUrl !== formData.media_uri) {
        setFormData((prev) => ({
          ...prev,
          media_uri: mediaUrl,
        }));
        console.log('✅ [DailyStatus] Form data updated with uploaded media URL');
      }

      console.log('✅ [DailyStatus] Closing sheet after successful save');
      setShowSheet(false);

      showToast({
        title: t('common.success') || 'Success',
        message: t('dailyStatus.dailyStatusSaved') || 'Your daily status has been saved!',
        type: 'success',
      });
    } catch (error) {
      console.error('❌ [DailyStatus] Exception saving daily status:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('dailyStatus.failedToSaveStatus') || 'Failed to save your status. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayStatus();
  }, [effectiveUserId]);

  // Refresh translations on mount to ensure we have the latest
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        console.log('🌍 [DailyStatus] Refreshing translations on mount');
        await refreshTranslations();
        console.log('✅ [DailyStatus] Translations refreshed successfully');
      } catch (error) {
        console.error('❌ [DailyStatus] Error refreshing translations:', error);
      }
    };
    loadTranslations();
  }, []);

  // Animated gradient border when no status - slow and subtle
  useEffect(() => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const hasStatus = pastStatuses[selectedDateString];

    if (!hasStatus && !isFuture) {
      // Start very slow, subtle rotation animation (15 seconds per rotation)
      const animation = Animated.loop(
        Animated.timing(gradientRotation, {
          toValue: 1,
          duration: 15000, // 15 seconds - very slow and subtle
          useNativeDriver: true,
        }),
      );
      animation.start();

      return () => {
        animation.stop();
        gradientRotation.setValue(0);
      };
    } else {
      // Stop animation and reset
      gradientRotation.stopAnimation();
      gradientRotation.setValue(0);
    }
  }, [todayStatus, pastStatuses, selectedDate, gradientRotation, isFuture]);

  useEffect(() => {
    loadStatusForDate(selectedDate);

    // Only close all sheets if switching to a future date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isFuture = selectedDate > today;
    if (isFuture) {
      console.log('🎯 [DailyStatus] Future date selected - closing all sheets');
      setShowLearningPathsSheet(false);
      setShowExerciseListSheet(false);
      setSelectedLearningPath(null);
      setShowRouteListSheet(false);
      setRouteCameFromDailyStatus(false);
      setShowRouteDetailSheet(false);
      setSelectedRouteId(null);
      setShowActionSheet(false);
    }
  }, [selectedDate, effectiveUserId]);

  // Note: DailyStatus doesn't need real-time subscriptions
  // It's a personal tracking component that only needs to refresh when user interacts with it

  // Pan gesture for drag-to-resize
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = currentSnapPoint + translationY;

      // Constrain to snap points range
      const minPosition = snapPoints.large;
      const maxPosition = snapPoints.small + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      sheetTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const currentPosition = currentSnapPoint + translationY;

      // Dismiss if dragged down far enough
      if (currentPosition > snapPoints.small + 30 && velocityY > 200) {
        runOnJS(() => setShowSheet(false))();
        return;
      }

      // Find closest snap point
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.small;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      sheetTranslateY.value = withSpring(targetSnapPoint, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });
      runOnJS(setCurrentSnapPoint)(targetSnapPoint);
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Animation effects - NO BOUNCING, smooth spring animations
  useEffect(() => {
    if (showSheet) {
      console.log('📱 [DailyStatus] Sheet opened - Current form data:', {
        status: formData.status,
        how_it_went: formData.how_it_went,
        challenges: formData.challenges,
        notes: formData.notes,
        driving_time_minutes: formData.driving_time_minutes,
        distance_km: formData.distance_km,
        rating: formData.rating,
        selectedExercises: selectedExercises.length,
      });

      sheetTranslateY.value = withSpring(snapPoints.large, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });
      setCurrentSnapPoint(snapPoints.large);

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      console.log('📱 [DailyStatus] Sheet closed');

      sheetTranslateY.value = withSpring(snapPoints.dismissed, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });

      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showSheet, backdropOpacity, snapPoints, formData]);

  const getStatusIcon = () => {
    if (!todayStatus) return 'help-circle';
    return todayStatus.status === 'drove' ? 'check-circle' : 'x-circle';
  };

  const getStatusColor = () => {
    if (!todayStatus) return colorScheme === 'dark' ? '#666' : '#999';
    return todayStatus.status === 'drove' ? '#4CAF50' : '#F44336';
  };

  const getStatusText = () => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const status = pastStatuses[selectedDateString];

    if (!status) {
      if (isToday) return t('dailyStatus.didYouDriveToday') || 'Did you drive today?';
      if (isFuture) return t('dailyStatus.futureDate') || 'Future date';
      return (
        t('dailyStatus.didYouDriveOnDate')?.replace(
          '{date}',
          selectedDate.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-US'),
        ) || `Did you drive on ${selectedDate.toLocaleDateString('en-US')}?`
      );
    }

    const dateText = isToday
      ? t('dailyStatus.today') || 'today'
      : selectedDate.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-US');
    return status.status === 'drove'
      ? t('dailyStatus.yesDroveOnDate')?.replace('{date}', dateText) ||
          `Yes, I drove on ${dateText}!`
      : t('dailyStatus.noDidntDriveOnDate')?.replace('{date}', dateText) ||
          `No, I didn't drive on ${dateText}`;
  };

  const getStatusForSelectedDate = () => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    return pastStatuses[selectedDateString] || null;
  };

  // Interpolate rotation for gradient
  const spin = gradientRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const hasStatus = getStatusForSelectedDate();
  const showGradientBorder = !hasStatus && !isFuture;

  return (
    <>
      {/* Daily Status Input-like Box - Fully Clickable with Animated Gradient Border */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 12,
          padding: showGradientBorder ? 2 : 0,
          backgroundColor: showGradientBorder ? '#0CA27A' : 'transparent', // Solid border color base
          overflow: 'hidden',
        }}
      >
        {showGradientBorder && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 16,
              opacity: 0.6, // Subtle fade effect on top
              transform: [{ rotate: spin }],
            }}
          >
            <LinearGradient
              colors={['#03FFBB', '#0CA27A', '#03FFBB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </Animated.View>
        )}
        <TouchableOpacity
          onPress={() => {
            console.log('👆 [DailyStatus] Input box clicked - opening sheet');
            setShowSheet(true);
          }}
          disabled={isFuture}
          style={{
            backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8',
            borderRadius: 12,
            padding: 12,
            borderWidth: showGradientBorder ? 0 : 1,
            borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
          }}
          activeOpacity={0.7}
        >
          {/* Status Content - Flat Input Style */}
          <XStack alignItems="center" gap="$2">
            {/* Plus icon - only show when no status exists */}
            {!getStatusForSelectedDate() && (
              <Feather
                name="edit-2"
                size={16}
                color={colorScheme === 'dark' ? '#38fdbf' : '#999'}
              />
            )}

            <YStack flex={1}>
              <Text
                fontSize="$3"
                fontWeight="400"
                color={
                  getStatusForSelectedDate()
                    ? colorScheme === 'dark'
                      ? '#FFF'
                      : '#000'
                    : colorScheme === 'dark'
                      ? '#AAA'
                      : '#666'
                }
                numberOfLines={1}
              >
                {getStatusForSelectedDate()
                  ? getStatusText()
                  : t('dailyStatus.placeholder') || 'Did you drive today? Share your thoughts!'}
              </Text>

              {getStatusForSelectedDate()?.how_it_went && (
                <Text
                  fontSize="$2"
                  color={colorScheme === 'dark' ? '#999' : '#666'}
                  numberOfLines={1}
                  marginTop="$0.5"
                >
                  {getStatusForSelectedDate()?.how_it_went}
                </Text>
              )}
            </YStack>
            <XStack gap="$2" alignItems="center">
              {getStatusForSelectedDate()?.media_uri && (
                <Feather name="image" size={20} color={colorScheme === 'dark' ? '#666' : '#999'} />
              )}
              {/* Message-circle icon - only show if there's a comment */}
              {getStatusForSelectedDate()?.how_it_went && (
                <Feather
                  name="message-circle"
                  size={20}
                  color={colorScheme === 'dark' ? '#666' : '#999'}
                />
              )}
            </XStack>
          </XStack>
        </TouchableOpacity>
      </View>

      {/* Status Sheet */}
      {showSheet && (
        <Modal
          visible={showSheet}
          transparent
          animationType="none"
          onRequestClose={() => setShowSheet(false)}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setShowSheet(false)} />
            <GestureDetector gesture={panGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: screenHeight,
                    backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  },
                  animatedSheetStyle,
                ]}
              >
                <YStack padding="$3" gap="$3" flex={1}>
                  {/* Drag Handle */}
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                      borderRadius: 2,
                      alignSelf: 'center',
                      marginVertical: 8,
                    }}
                  />
                  {/* Header */}
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text
                        fontSize="$5"
                        fontWeight="bold"
                        color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      >
                        {isToday
                          ? t('dailyStatus.didYouDriveToday') || 'Did you drive today?'
                          : t('dailyStatus.didYouDriveOnDate')?.replace(
                              '{date}',
                              selectedDate.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-US'),
                            ) || `Did you drive on ${selectedDate.toLocaleDateString('en-US')}?`}
                      </Text>
                      {!isToday && (
                        <Text fontSize="$2" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                          {isFuture
                            ? t('dailyStatus.futureDateCannotSave') || 'Future date - cannot save'
                            : t('dailyStatus.editPreviousStatus') || 'Edit previous status'}
                        </Text>
                      )}
                    </YStack>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('❌ [DailyStatus] Close button clicked - Current form data:', {
                          status: formData.status,
                          how_it_went: formData.how_it_went,
                          challenges: formData.challenges,
                          notes: formData.notes,
                          driving_time_minutes: formData.driving_time_minutes,
                          distance_km: formData.distance_km,
                        });
                        setShowSheet(false);
                      }}
                    >
                      <Feather
                        name="x"
                        size={20}
                        color={colorScheme === 'dark' ? '#FFF' : '#666'}
                      />
                    </TouchableOpacity>
                  </XStack>

                  {/* Scrollable Content */}
                  <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <YStack gap="$3">
                      {/* Status Selection */}
                      <YStack gap="$2">
                        <Text
                          fontSize="$3"
                          fontWeight="600"
                          color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        >
                          {t('dailyStatus.status') || 'Status'}
                        </Text>

                        <XStack gap="$2">
                          <IconButton
                            icon="check-circle"
                            label={t('dailyStatus.yesIDrove') || 'Yes, I drove'}
                            onPress={() => {
                              const newStatus = formData.status === 'drove' ? null : 'drove';
                              console.log('✅ [DailyStatus] Status toggled:', newStatus);
                              setFormData((prev) => ({ ...prev, status: newStatus }));
                              if (newStatus) setStatusError(''); // Clear error when status is selected
                            }}
                            selected={formData.status === 'drove'}
                            backgroundColor={
                              formData.status === 'drove'
                                ? 'transparent'
                                : colorScheme === 'dark'
                                  ? 'transparent'
                                  : 'transparent'
                            }
                            borderColor={
                              formData.status === 'drove'
                                ? 'transparent'
                                : colorScheme === 'dark'
                                  ? 'transparent'
                                  : 'transparent'
                            }
                            flex={1}
                          />

                          <IconButton
                            icon="x-circle"
                            label={t('dailyStatus.noDidntDrive') || "No, I didn't drive"}
                            onPress={() => {
                              const newStatus =
                                formData.status === 'didnt_drive' ? null : 'didnt_drive';
                              console.log('❌ [DailyStatus] Status toggled:', newStatus);
                              setFormData((prev) => ({ ...prev, status: newStatus }));
                              if (newStatus) setStatusError(''); // Clear error when status is selected
                            }}
                            selected={formData.status === 'didnt_drive'}
                            backgroundColor={
                              formData.status === 'didnt_drive'
                                ? 'transparent'
                                : colorScheme === 'dark'
                                  ? 'transparent'
                                  : 'transparent'
                            }
                            borderColor={
                              formData.status === 'didnt_drive'
                                ? 'transparent'
                                : colorScheme === 'dark'
                                  ? 'transparent'
                                  : 'transparent'
                            }
                            flex={1}
                          />
                        </XStack>

                        {/* Inline error message for status validation */}
                        {statusError && (
                          <XStack
                            alignItems="center"
                            gap="$2"
                            padding="$2"
                            backgroundColor="rgba(244, 67, 54, 0.1)"
                            borderRadius={8}
                            borderWidth={1}
                            borderColor="rgba(244, 67, 54, 0.3)"
                          >
                            <Feather name="alert-circle" size={14} color="#F44336" />
                            <Text fontSize="$2" color="#F44336">
                              {statusError}
                            </Text>
                          </XStack>
                        )}
                      </YStack>

                      {/* How it went */}
                      <FormField
                        label={t('dailyStatus.howItWent') || 'How did it go?'}
                        placeholder={
                          t('dailyStatus.howItWentPlaceholder') || 'Tell us how it went...'
                        }
                        value={formData.how_it_went}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, how_it_went: text }))
                        }
                        multiline
                        numberOfLines={2}
                      />

                      {/* Challenges */}
                      <FormField
                        label={t('dailyStatus.challenges') || 'Challenges?'}
                        placeholder={
                          t('dailyStatus.challengesPlaceholder') || 'What was challenging?'
                        }
                        value={formData.challenges}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, challenges: text }))
                        }
                        multiline
                        numberOfLines={2}
                      />

                      {/* Notes */}
                      <FormField
                        label={t('dailyStatus.notes') || 'Notes'}
                        placeholder={t('dailyStatus.notesPlaceholder') || 'Additional notes...'}
                        value={formData.notes}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
                        multiline
                        numberOfLines={2}
                      />

                      {/* Driving Details - Show only if drove */}
                      {formData.status === 'drove' && (
                        <YStack gap="$3">
                          {/* Driving Time - Chip Selector */}
                          <YStack gap="$1.5">
                            <Text
                              fontSize="$3"
                              fontWeight="600"
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            >
                              {t('dailyStatus.timeMinutes') || 'Time (minutes)'}
                            </Text>
                            <XStack gap="$2" flexWrap="wrap">
                              {[10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                                <TouchableOpacity
                                  key={minutes}
                                  onPress={() => {
                                    const newTime =
                                      formData.driving_time_minutes === minutes ? 0 : minutes;
                                    console.log(
                                      '⏱️ [DailyStatus] Time toggled:',
                                      newTime,
                                      'minutes',
                                    );
                                    setFormData((prev) => ({
                                      ...prev,
                                      driving_time_minutes: newTime,
                                    }));
                                  }}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor:
                                      formData.driving_time_minutes === minutes
                                        ? '#00E6C3'
                                        : colorScheme === 'dark'
                                          ? '#333'
                                          : '#F0F0F0',
                                    borderWidth: 1,
                                    borderColor:
                                      formData.driving_time_minutes === minutes
                                        ? '#00E6C3'
                                        : colorScheme === 'dark'
                                          ? '#555'
                                          : '#DDD',
                                  }}
                                >
                                  <Text
                                    fontSize="$2"
                                    color={
                                      formData.driving_time_minutes === minutes
                                        ? '#000'
                                        : colorScheme === 'dark'
                                          ? '#FFF'
                                          : '#000'
                                    }
                                    fontWeight={
                                      formData.driving_time_minutes === minutes ? 'bold' : 'normal'
                                    }
                                  >
                                    {minutes}m
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </XStack>
                          </YStack>

                          {/* Distance - Chip Selector */}
                          <YStack gap="$1.5">
                            <Text
                              fontSize="$3"
                              fontWeight="600"
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            >
                              {t('dailyStatus.distanceKm') || 'Distance (km)'}
                            </Text>
                            <XStack gap="$2" flexWrap="wrap">
                              {[1, 3, 5, 10, 15, 20, 30, 50].map((km) => (
                                <TouchableOpacity
                                  key={km}
                                  onPress={() => {
                                    const newDistance = formData.distance_km === km ? 0 : km;
                                    console.log(
                                      '📏 [DailyStatus] Distance toggled:',
                                      newDistance,
                                      'km',
                                    );
                                    setFormData((prev) => ({ ...prev, distance_km: newDistance }));
                                  }}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor:
                                      formData.distance_km === km
                                        ? '#00E6C3'
                                        : colorScheme === 'dark'
                                          ? '#333'
                                          : '#F0F0F0',
                                    borderWidth: 1,
                                    borderColor:
                                      formData.distance_km === km
                                        ? '#00E6C3'
                                        : colorScheme === 'dark'
                                          ? '#555'
                                          : '#DDD',
                                  }}
                                >
                                  <Text
                                    fontSize="$2"
                                    color={
                                      formData.distance_km === km
                                        ? '#000'
                                        : colorScheme === 'dark'
                                          ? '#FFF'
                                          : '#000'
                                    }
                                    fontWeight={formData.distance_km === km ? 'bold' : 'normal'}
                                  >
                                    {km}km
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </XStack>
                          </YStack>

                          {/* Rating */}
                          <YStack gap="$1.5">
                            <Text
                              fontSize="$3"
                              fontWeight="600"
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            >
                              {t('dailyStatus.ratingStars') || 'Rating (1-5 stars)'}
                            </Text>
                            <XStack gap="$2" alignItems="center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                  key={star}
                                  onPress={() => setFormData((prev) => ({ ...prev, rating: star }))}
                                  style={{ padding: 4 }}
                                >
                                  <Feather
                                    name="star"
                                    size={24}
                                    color={
                                      star <= (formData.rating || 0)
                                        ? '#FFD700'
                                        : colorScheme === 'dark'
                                          ? '#666'
                                          : '#CCC'
                                    }
                                  />
                                </TouchableOpacity>
                              ))}
                              <Text
                                fontSize="$2"
                                color={colorScheme === 'dark' ? '#CCC' : '#666'}
                                marginLeft="$2"
                              >
                                {formData.rating || 0}/5
                              </Text>
                            </XStack>
                          </YStack>
                        </YStack>
                      )}

                      {/* Memory (Photo/Video) Section */}
                      <YStack gap="$2" marginTop="$2">
                        <Text
                          fontSize="$3"
                          fontWeight="600"
                          color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        >
                          {t('dailyStatus.memoryPhotoVideo') || 'Memory (Photo/Video)'}
                        </Text>

                        {formData.media_uri ? (
                          <YStack gap="$2">
                            {/* Media Preview */}
                            <View
                              style={{
                                position: 'relative',
                                borderRadius: 12,
                                overflow: 'hidden',
                                backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA',
                              }}
                            >
                              {formData.media_type === 'image' ? (
                                <Image
                                  source={{ uri: formData.media_uri }}
                                  style={{
                                    width: '100%',
                                    height: 200,
                                    borderRadius: 12,
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Video
                                  source={{ uri: formData.media_uri }}
                                  style={{
                                    width: '100%',
                                    height: 200,
                                    borderRadius: 12,
                                  }}
                                  useNativeControls
                                  resizeMode="cover"
                                  isLooping
                                />
                              )}

                              {/* Remove button overlay */}
                              <TouchableOpacity
                                onPress={handleRemoveMedia}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                  borderRadius: 20,
                                  padding: 8,
                                }}
                              >
                                <Feather name="x" size={18} color="#FFF" />
                              </TouchableOpacity>
                            </View>
                          </YStack>
                        ) : (
                          <TouchableOpacity
                            onPress={handleAddMedia}
                            style={{
                              padding: 16,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderStyle: 'dashed',
                              borderColor: colorScheme === 'dark' ? '#444' : '#CCC',
                              backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA',
                              alignItems: 'center',
                            }}
                          >
                            <Feather
                              name="camera"
                              size={32}
                              color={colorScheme === 'dark' ? '#888' : '#AAA'}
                            />
                            <Text
                              fontSize="$2"
                              color={colorScheme === 'dark' ? '#CCC' : '#666'}
                              marginTop="$2"
                            >
                              {t('dailyStatus.addPhotoOrVideo') || 'Add Photo or Video'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </YStack>

                      {/* Selected Exercises List */}
                      {selectedExercises.length > 0 && (
                        <YStack gap="$2" marginTop="$2">
                          <Text
                            fontSize="$3"
                            fontWeight="600"
                            color={colorScheme === 'dark' ? '#FFF' : '#000'}
                          >
                            {t('dailyStatus.selectedExercises')?.replace(
                              '{count}',
                              selectedExercises.length.toString(),
                            ) || `Selected Exercises (${selectedExercises.length})`}
                          </Text>
                          {selectedExercises.map((exercise, index) => (
                            <XStack
                              key={exercise.id}
                              alignItems="center"
                              justifyContent="space-between"
                              padding="$2"
                              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                              borderRadius={8}
                              borderWidth={1}
                              borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                            >
                              <Text
                                fontSize="$2"
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                                flex={1}
                              >
                                {exercise.title}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  console.log(
                                    '🗑️ [DailyStatus] Removing exercise:',
                                    exercise.title,
                                  );
                                  setSelectedExercises((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  );
                                }}
                                style={{ padding: 4 }}
                              >
                                <Feather
                                  name="x"
                                  size={18}
                                  color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'}
                                />
                              </TouchableOpacity>
                            </XStack>
                          ))}
                        </YStack>
                      )}

                      {/* Exercise Learning Button - Show for today and past dates */}
                      {!isFuture && (
                        <IconButton
                          icon="book-open"
                          label={
                            isToday
                              ? t('dailyStatus.didYouDoExercisesToday') ||
                                'Did you do any exercises today?'
                              : t('dailyStatus.didYouDoExercisesOnDate')?.replace(
                                  '{date}',
                                  selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  }),
                                ) ||
                                `Did you do any exercises on ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}?`
                          }
                          onPress={() => {
                            console.log(
                              '🎯 [DailyStatus] Opening learning paths from modal - hiding DailyStatus modal',
                            );

                            // Hide DailyStatus modal first
                            setShowSheet(false);

                            // Set flag to remember we came from DailyStatus
                            setCameFromDailyStatus(true);

                            // Show learning paths sheet after a brief delay for smooth transition
                            setTimeout(() => {
                              setShowLearningPathsSheet(true);
                            }, 200);
                          }}
                          backgroundColor="transparent"
                          borderColor="transparent"
                        />
                      )}

                      {/* Route Integration Buttons */}
                      <XStack gap="$2">
                        {/* Find Routes Button */}
                        <IconButton
                          icon="map-pin"
                          label={t('dailyStatus.findRoutes') || 'Find Routes'}
                          onPress={handleNavigateToMap}
                          flex={1}
                          backgroundColor="transparent"
                          borderColor="transparent"
                        />

                        {/* My Routes Button */}
                        <IconButton
                          icon="list"
                          label={t('dailyStatus.myRoutes') || 'My Routes'}
                          onPress={handleOpenRouteList}
                          flex={1}
                          backgroundColor="transparent"
                          borderColor="transparent"
                        />

                        {/* Create or Record Route Button */}
                        <IconButton
                          icon="plus"
                          label={t('dailyStatus.createOrRecordRoute') || 'Create or Record Route'}
                          onPress={handleOpenActionSheet}
                          flex={1}
                          backgroundColor="transparent"
                          borderColor="transparent"
                        />
                      </XStack>
                    </YStack>
                  </ScrollView>

                  {/* Action Buttons - Fixed at bottom */}
                  <View
                    style={[
                      styles.footer,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                        borderTopWidth: 0,
                        borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                      },
                    ]}
                  >
                    <YStack gap="$2">
                      <Button
                        size="sm"
                        variant={isFuture ? 'secondary' : 'primary'}
                        onPress={saveDailyStatus}
                        disabled={loading || isFuture}
                      >
                        {loading
                          ? t('dailyStatus.saving') || 'Saving...'
                          : isFuture
                            ? t('dailyStatus.comeBackOnThisDay') || 'Come back on this day'
                            : t('dailyStatus.saveStatus') || 'Save Status'}
                      </Button>

                      {/* Reset Button - Only show if not future and not currently saving */}
                      {!isFuture && !loading && (
                        <Button size="sm" variant="link" onPress={resetDailyStatus}>
                          {t('dailyStatus.resetStatus') || 'Reset Status'}
                        </Button>
                      )}
                    </YStack>
                  </View>
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </Animated.View>
        </Modal>
      )}

      {/* Learning Paths Sheet Modal (Level 0) - Show for today and past dates */}
      <LearningPathsSheet
        visible={showLearningPathsSheet}
        onClose={() => {
          console.log('🎯 [DailyStatus] LearningPathsSheet closed via X button');
          setShowLearningPathsSheet(false);
          setCameFromDailyStatus(false);
        }}
        onBack={
          cameFromDailyStatus
            ? () => {
                console.log('🎯 [DailyStatus] Back arrow pressed - returning to DailyStatus modal');
                setShowLearningPathsSheet(false);
                setCameFromDailyStatus(false);
                setTimeout(() => {
                  setShowSheet(true);
                }, 100);
              }
            : undefined
        }
        onPathSelected={(path) => {
          console.log(
            '🎯 [DailyStatus] Learning path selected:',
            path.title[lang] || path.title.en,
          );
          setSelectedLearningPath(path);
          setShowLearningPathsSheet(false);
          setShowExerciseListSheet(true);
        }}
        title={
          isToday
            ? 'Learning for today'
            : `Learning for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        }
        initialSnapPoint="large"
      />

      {/* Exercise List Sheet Modal (Level 1) - Show for today and past dates */}
      <ExerciseListSheet
        visible={showExerciseListSheet}
        onClose={() => {
          console.log(
            '🎯 [DailyStatus] ExerciseListSheet closed - checking if came from DailyStatus',
          );
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);

          // If came from DailyStatus, return to DailyStatus modal
          if (cameFromDailyStatus) {
            console.log('🎯 [DailyStatus] Returning to DailyStatus modal from ExerciseListSheet');
            setCameFromDailyStatus(false);
            setTimeout(() => {
              setShowSheet(true);
            }, 100);
          }
        }}
        onBackToAllPaths={() => {
          console.log('🎯 [DailyStatus] Back to all paths from ExerciseListSheet');
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);

          // Always go back to LearningPathsSheet when coming from DailyStatus
          setShowLearningPathsSheet(true);
        }}
        onExerciseCompleted={(exerciseId, exerciseTitle) => {
          console.log('✅ [DailyStatus] Exercise completed:', exerciseTitle);
          // Add to selected exercises if not already there
          setSelectedExercises((prev) => {
            const exists = prev.find((e) => e.id === exerciseId);
            if (!exists) {
              return [...prev, { id: exerciseId, title: exerciseTitle }];
            }
            return prev;
          });
        }}
        title={
          selectedLearningPath
            ? selectedLearningPath.title[lang] || selectedLearningPath.title.en
            : 'Exercises'
        }
        learningPathId={selectedLearningPath?.id || undefined}
        showAllPaths={false}
      />

      {/* Route List Sheet Modal */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => {
          console.log('📋 [DailyStatus] RouteListSheet closed via X button');
          setShowRouteListSheet(false);
          setRouteCameFromDailyStatus(false);
        }}
        onBack={
          routeCameFromDailyStatus
            ? () => {
                console.log(
                  '📋 [DailyStatus] Back arrow pressed - returning to DailyStatus modal from RouteListSheet',
                );
                setShowRouteListSheet(false);
                setRouteCameFromDailyStatus(false);
                setTimeout(() => {
                  setShowSheet(true);
                }, 100);
              }
            : undefined
        }
        onRoutePress={handleRoutePress}
        title={
          isToday
            ? 'My Routes for Today'
            : `My Routes for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        }
        type="saved"
      />

      {/* Action Sheet */}
      <ActionSheet
        isVisible={showActionSheet}
        onClose={() => {
          console.log('⚡ [DailyStatus] ActionSheet closed');
          setShowActionSheet(false);
        }}
        onCreateRoute={(routeData) => {
          console.log(
            '⚡ [DailyStatus] Route created from ActionSheet:',
            routeData ? 'with data' : 'without data',
          );
          setShowActionSheet(false);

          // Show success message
          showToast({
            title: routeData ? 'Route Recorded' : 'Route Created',
            message: routeData
              ? 'Your driving session has been recorded!'
              : 'Your route has been created successfully!',
            type: 'success',
          });

          // Return to DailyStatus modal
          setTimeout(() => {
            setShowSheet(true);
          }, 100);
        }}
        onNavigateToMap={(routeId) => {
          console.log('⚡ [DailyStatus] Navigating to map from ActionSheet:', routeId);
          setShowActionSheet(false);

          // Navigate to map
          (navigation as any).navigate('MainTabs', {
            screen: 'MapTab',
            params: {
              screen: 'MapScreen',
              params: { routeId },
            },
          });
        }}
      />

      {/* Route Detail Sheet Modal */}
      {(() => {
        console.log('🗺️ [DailyStatus] RouteDetailSheet render check:', {
          visible: showRouteDetailSheet,
          selectedRouteId,
          hasRouteId: !!selectedRouteId,
        });

        return (
          <RouteDetailSheet
            visible={showRouteDetailSheet}
            onClose={() => {
              console.log('🗺️ [DailyStatus] RouteDetailSheet closed');
              setShowRouteDetailSheet(false);
              setSelectedRouteId(null);

              // Return to DailyStatus if it was opened from there
              setTimeout(() => {
                setShowSheet(true);
              }, 100);
            }}
            routeId={selectedRouteId}
            onStartRoute={(routeId) => {
              console.log('🗺️ [DailyStatus] Starting route from RouteDetailSheet:', routeId);
              setShowRouteDetailSheet(false);

              // Navigate to map with route
              (navigation as any).navigate('MainTabs', {
                screen: 'MapTab',
                params: {
                  screen: 'MapScreen',
                  params: { routeId },
                },
              });
            }}
            onNavigateToProfile={(userId) => {
              console.log('👤 [DailyStatus] Navigating to profile:', userId);
              setShowRouteDetailSheet(false);

              // Navigate to profile
              (navigation as any).navigate('PublicProfile', { userId });
            }}
            onReopen={() => {
              console.log(
                '🗺️ [DailyStatus] Reopening RouteDetailSheet - selectedRouteId:',
                selectedRouteId,
              );
              if (selectedRouteId) {
                setTimeout(() => {
                  setShowRouteDetailSheet(true);
                }, 100);
              } else {
                // Return to DailyStatus if no route selected
                console.log('🗺️ [DailyStatus] No route selected, returning to DailyStatus');
                setTimeout(() => {
                  setShowSheet(true);
                }, 100);
              }
            }}
          />
        );
      })()}
    </>
  );
}
