import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { ImageOff } from '@tamagui/lucide-icons';

interface ImageWithFallbackProps {
  source: { uri: string };
  style?: ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fallbackStyle?: ViewStyle;
}

export function ImageWithFallback({
  source,
  style,
  resizeMode = 'cover',
  fallbackStyle,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError) {
    return (
      <View style={[styles.fallback, style, fallbackStyle]}>
        <ImageOff size={24} color="#9CA3AF" />
        <Text style={styles.fallbackText}>Image not available</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        console.log(
          '🖼️ [ImageWithFallback] Image failed to load, showing placeholder:',
          source.uri,
        );
        setHasError(true);
        setIsLoading(false);
      }}
      onLoad={() => {
        setIsLoading(false);
      }}
      onLoadStart={() => {
        setIsLoading(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
