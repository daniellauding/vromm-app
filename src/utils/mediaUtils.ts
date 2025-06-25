import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

export type MediaType = 'image' | 'video' | 'youtube';

export interface MediaItem {
  id: string;
  type: MediaType;
  uri: string;
  fileName?: string;
  description?: string;
  thumbnail?: string;
}

export interface MediaUrl {
  type: MediaType;
  url: string;
  description?: string;
}

/**
 * Pick media from library with robust error handling and stable settings
 */
export const pickMediaFromLibrary = async (allowMultiple = true): Promise<MediaItem[] | null> => {
  try {
    // Request permissions with proper error handling
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Media library permission is required to select photos/videos',
      );
      return null;
    }

    // Use stable settings that match working AddReviewScreen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images for stability
      allowsMultipleSelection: allowMultiple,
      quality: 0.8, // Stable quality setting
      allowsEditing: true, // Match working implementation
      base64: false, // Don't request base64 for better performance
    });

    if (result.canceled) return null;

    // Process selected media with error handling
    return result.assets.map((asset) => ({
      id: Date.now().toString() + Math.random(),
      type: 'image', // Only images for stability
      uri: asset.uri,
      fileName: asset.uri.split('/').pop() || 'image.jpg',
    }));
  } catch (error) {
    console.error('Error picking media:', error);
    Alert.alert('Error', 'Failed to select media. Please try again.');
    return null;
  }
};

/**
 * Take a photo with the camera using stable settings
 */
export const takePhoto = async (): Promise<MediaItem | null> => {
  try {
    // Request camera permission with proper error handling
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take photos');
      return null;
    }

    // Use stable settings that match working AddReviewScreen
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, // Stable quality setting
      allowsEditing: true, // Match working implementation
      base64: false, // Don't request base64 for better performance
    });

    if (result.canceled) return null;

    // Create media item with error handling
    const asset = result.assets[0];
    if (!asset || !asset.uri) {
      throw new Error('No image captured');
    }

    return {
      id: Date.now().toString() + Math.random(),
      type: 'image',
      uri: asset.uri,
      fileName: asset.uri.split('/').pop() || 'photo.jpg',
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
};

/**
 * Record a video with the camera (optional, more complex)
 */
export const recordVideo = async (): Promise<MediaItem | null> => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to record videos');
      return null;
    }

    // Use conservative settings for video
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.5, // Lower quality for videos to prevent memory issues
      videoMaxDuration: 30, // 30 seconds max to prevent memory issues
      allowsEditing: false, // No editing for videos
      base64: false,
    });

    if (result.canceled) return null;

    // Create media item
    const asset = result.assets[0];
    if (!asset || !asset.uri) {
      throw new Error('No video recorded');
    }

    return {
      id: Date.now().toString() + Math.random(),
      type: 'video',
      uri: asset.uri,
      fileName: asset.uri.split('/').pop() || 'video.mp4',
    };
  } catch (error) {
    console.error('Error recording video:', error);
    Alert.alert('Error', 'Failed to record video. Please try again.');
    return null;
  }
};

/**
 * Create YouTube media item
 */
export const createYoutubeMediaItem = (url: string): MediaItem | null => {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  return {
    id: Date.now().toString() + Math.random(),
    type: 'youtube',
    uri: url,
    fileName: `youtube-${videoId}`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
};

/**
 * Extract YouTube video ID from URL
 */
export const extractYoutubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/**
 * Upload media to Supabase storage with stable error handling
 */
export const uploadMediaToSupabase = async (
  mediaItem: MediaItem,
  bucket: string,
  folder: string,
): Promise<string | null> => {
  try {
    if (mediaItem.type === 'youtube') {
      // YouTube links don't need uploading
      return mediaItem.uri;
    }

    // Read file using the same method as working AddReviewScreen
    const response = await fetch(mediaItem.uri);
    const blob = await response.blob();
    
    // Convert to base64 using FileReader (stable method)
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = () => reject(new Error('Failed to process image'));
      reader.readAsDataURL(blob);
    });

    // Determine file extension
    const ext = mediaItem.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random()}.${ext}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, decode(base64), {
        contentType: `${mediaItem.type}/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
};
