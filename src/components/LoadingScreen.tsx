import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { YStack } from 'tamagui';
import { logWarn } from '../utils/logger';

interface LoadingScreenProps {
  message?: string;
  showAfterMs?: number;
  timeout?: number;
  onTimeout?: () => void;
}

export function LoadingScreen({
  message = 'Loading...',
  showAfterMs = 500,
  timeout = 10000,
  onTimeout,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(false);
  const [dots, setDots] = useState('');
  const fadeAnim = new Animated.Value(0);
  const startTime = Date.now();

  // Show loading screen only after delay (to avoid flash)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      logWarn('Loading screen shown - app taking longer than expected', {
        delay: showAfterMs,
        message,
        platform: Platform.OS,
      });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, showAfterMs);

    return () => clearTimeout(timer);
  }, [showAfterMs, fadeAnim, message]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Timeout handling
  useEffect(() => {
    if (timeout && onTimeout) {
      const timer = setTimeout(() => {
        const loadTime = Date.now() - startTime;
        logWarn('Loading timeout reached', {
          timeout,
          actualTime: loadTime,
          message,
        });
        onTimeout();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [timeout, onTimeout, startTime, message]);

  if (!visible) return null;

  const asciiArt =
    Platform.OS === 'android' && Platform.Version < 28
      ? ['  ╭─────╮', '  │ ◐ ◑ │', '  │  ▼  │', '  ╰─────╯', '  Loading']
      : [
          '  ╭─────────╮',
          '  │ ◐ ◑ ◐ ◑ │',
          '  │    ▼    │',
          '  │ ◑ ◐ ◑ ◐ │',
          '  ╰─────────╯',
          '   Loading',
        ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <YStack alignItems="center" justifyContent="center" gap="$4">
        <View style={styles.asciiContainer}>
          {asciiArt.map((line, index) => (
            <Text key={index} style={styles.asciiText}>
              {line}
            </Text>
          ))}
          <Text style={styles.dotsText}>{dots}</Text>
        </View>

        <Text style={styles.messageText}>{message}</Text>

        <Text style={styles.hintText}>
          {Platform.OS === 'android' && Platform.Version < 28
            ? 'Optimizing for older device...'
            : 'Please wait...'}
        </Text>
      </YStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  asciiContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  asciiText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16,
    color: '#00FFBC',
    lineHeight: 20,
    textAlign: 'center',
  },
  dotsText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16,
    color: '#00FFBC',
    height: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  messageText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
