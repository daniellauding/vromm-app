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
  fileName: string;
  description?: string;
  thumbnail?: string;
}

export interface MediaUrl {
  type: MediaType;
  url: string;
  description?: string;
}

/**
 * Pick media from library with robust error handling
 */
export const pickMediaFromLibrary = async (allowMultiple = true): Promise<MediaItem[] | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Media library permission is required to select photos/videos',
      );
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: allowMultiple,
      quality: 0.5, // Lower quality to prevent memory issues
      allowsEditing: false,
      base64: false, // Don't request base64 for better performance
    });

    if (result.canceled) return null;

    // Process selected media
    return result.assets.map((asset) => ({
      id: Date.now().toString() + Math.random(),
      type: asset.type === 'video' ? 'video' : 'image',
      uri: asset.uri,
      fileName: asset.uri.split('/').pop() || 'file',
    }));
  } catch (error) {
    console.error('Error picking media:', error);
    Alert.alert('Error', 'Failed to select media. Please try again.');
    return null;
  }
};

/**
 * Take a photo with the camera
 */
export const takePhoto = async (): Promise<MediaItem | null> => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take photos');
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: false,
      base64: false,
    });

    if (result.canceled) return null;

    // Create media item
    const asset = result.assets[0];
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
 * Record a video with the camera
 */
export const recordVideo = async (): Promise<MediaItem | null> => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to record videos');
      return null;
    }

    // Launch camera for video
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.5,
      videoMaxDuration: 30, // 30 seconds max to prevent memory issues
      allowsEditing: false,
      base64: false,
    });

    if (result.canceled) return null;

    // Create media item
    const asset = result.assets[0];
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
 * Upload media to Supabase storage
 */
export const uploadMediaToSupabase = async (
  media: MediaItem,
  bucketName: string,
  folderPath: string,
): Promise<string | null> => {
  try {
    if (media.type === 'youtube') {
      // For YouTube links, just return the URL
      return media.uri;
    }

    // For local files
    if (!media.uri.startsWith('file://') && !media.uri.startsWith('content://')) {
      console.error('Invalid media URI format:', media.uri);
      return null;
    }

    const fileExtension =
      media.fileName.split('.').pop() || (media.type === 'video' ? 'mp4' : 'jpg');
    const filePath = `${folderPath}/${Date.now()}.${fileExtension}`;

    // Read file as base64
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(media.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readError) {
      console.error('Error reading file:', readError);
      return null;
    }

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, decode(base64), {
        contentType: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    return null;
  }
};

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Create a YouTube media item from a URL
 */
export const createYoutubeMediaItem = (url: string): MediaItem | null => {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  return {
    id: Date.now().toString(),
    type: 'youtube',
    uri: `https://www.youtube.com/watch?v=${videoId}`,
    fileName: 'YouTube Video',
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
};
