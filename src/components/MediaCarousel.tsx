import React from 'react';
import { View, Image, Dimensions, TouchableOpacity, Alert, Text } from 'react-native';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Region } from '../types/maps';
import { MediaItem as RouteMediaItem } from '../types/route';

export type CarouselMediaItem = {
  type: 'image' | 'video' | 'youtube' | 'map' | 'upload';
  uri?: string;
  waypoints?: any[];
  region?: Region;
  id?: string;
  penDrawingCoordinates?: Array<{ latitude: number; longitude: number }>;
};

type Props = {
  media: CarouselMediaItem[];
  onAddMedia: (newMedia: Pick<RouteMediaItem, 'type' | 'uri'>) => void;
  onRemoveMedia: (index: number) => void;
  height: number;
};

export function MediaCarousel({ media, onAddMedia, onRemoveMedia, height }: Props) {
  const windowWidth = Dimensions.get('window').width;

  // Filter out invalid media items
  const validMedia = media.filter((item) => {
    if (item.type === 'map') return true;
    if (!item.uri && item.type !== 'map') return false;
    return ['image', 'video', 'youtube', 'map'].includes(item.type);
  });

  const showMediaOptions = () => {
    Alert.alert('Add Media', 'Choose a method to add media', [
      {
        text: 'Take Photo/Video',
        onPress: takePhoto,
      },
      {
        text: 'Choose from Library',
        onPress: pickImage,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const pickImage = async () => {
    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images for stability
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8, // Stable quality setting
      });

      if (!result.canceled && result.assets[0]) {
        onAddMedia({
          type: 'image', // Only images for stability
          uri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8, // Stable quality setting
      });

      if (!result.canceled && result.assets[0]) {
        onAddMedia({
          type: 'image', // Only images for stability
          uri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const renderItem = ({ item, index }: { item: CarouselMediaItem; index: number }) => {
    if (item.type === 'upload') {
      return (
        <TouchableOpacity
          style={{
            width: windowWidth,
            height,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
          }}
          onPress={showMediaOptions}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Feather name="plus-circle" size={48} color="#666" />
            <Text style={{ color: '#666', fontSize: 16 }}>Add Media</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'map') {
      return (
        <View style={{ width: windowWidth, height }}>
          <View style={{ flex: 1 }}>
            <Map
              waypoints={item.waypoints || []}
              region={item.region}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              style={{ width: '100%', height: '100%' }}
              penDrawingCoordinates={item.penDrawingCoordinates || []}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: 1,
              }}
            />
          </View>
        </View>
      );
    }

    // For media items (image, video, youtube)
    return (
      <View style={{ width: windowWidth, height, overflow: 'visible' }}>
        <View style={{ flex: 1, position: 'relative' }}>
          <Image
            source={{ uri: item.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: 8,
              zIndex: 2,
              elevation: 2,
            }}
            onPress={() => onRemoveMedia(index)}
          >
            <Feather name="trash-2" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // If no valid media and no map, show only the add button
  if (validMedia.length === 0) {
    return (
      <TouchableOpacity
        style={{
          width: '100%',
          height,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
        }}
        onPress={showMediaOptions}
      >
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Feather name="plus-circle" size={48} color="#666" />
          <Text style={{ color: '#666', fontSize: 16 }}>Add Media</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Add the upload option only if we have space for more media
  const carouselData =
    validMedia.length < 5 ? [...validMedia, { type: 'upload' as const }] : validMedia;

  return (
    <View style={{ height, overflow: 'visible' }}>
      <Carousel
        loop={false}
        width={windowWidth}
        height={height}
        data={carouselData}
        renderItem={renderItem}
        pagingEnabled
        snapEnabled
        enabled={true}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
        defaultIndex={0}
        style={{ overflow: 'visible' }}
      />
    </View>
  );
}
