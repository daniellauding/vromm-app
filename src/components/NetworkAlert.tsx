import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Wifi, WifiOff } from '@tamagui/lucide-icons';

const { width } = Dimensions.get('window');

export function NetworkAlert() {
  const [isConnected, setIsConnected] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-60)); // Start off-screen

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected) {
        // Slide down to show alert
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // Slide up to hide alert
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => unsubscribe();
  }, [slideAnim]);

  if (isConnected) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <WifiOff size={16} color="#FFF" />
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#EF4444',
    zIndex: 9999,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 