import React, { useRef, useState, useEffect } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import { XStack } from 'tamagui';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { NotificationBell } from '../../components/NotificationBell';

interface ScrollableHeaderProps {
  scrollY: Animated.Value;
  onAvatarPress: () => void;
  onNotificationPress: () => void;
  onUsersPress?: () => void;
  isAdmin?: boolean;
  profileAvatarRef?: any;
}

export const ScrollableHeader: React.FC<ScrollableHeaderProps> = ({
  scrollY,
  onAvatarPress,
  onNotificationPress,
  onUsersPress,
  isAdmin = false,
  profileAvatarRef,
}) => {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  
  // State for blur intensity
  const [blurIntensity, setBlurIntensity] = useState(0);
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  
  // Configure scroll listener
  useEffect(() => {
    if (!scrollY) return;
    
    const listener = scrollY.addListener(({ value }) => {
      const currentScrollY = value;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      const shouldHide = isScrollingDown && currentScrollY > 100;
      
      // Update blur intensity
      if (currentScrollY <= 50) {
        setBlurIntensity(0);
      } else if (currentScrollY >= 150) {
        setBlurIntensity(80);
      } else {
        const intensity = ((currentScrollY - 50) / 100) * 80;
        setBlurIntensity(Math.round(intensity));
      }
      
      // Handle header hide/show on scroll
      if (shouldHide !== !isHeaderVisible) {
        setIsHeaderVisible(!shouldHide);
        
        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: shouldHide ? 0 : 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(headerTranslateY, {
            toValue: shouldHide ? -80 : 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      lastScrollY.current = currentScrollY;
    });
    
    return () => {
      try {
        scrollY.removeListener(listener);
      } catch (error) {
        // Ignore if listener already removed
      }
    };
  }, [scrollY, headerOpacity, headerTranslateY, isHeaderVisible]);
  
  const iconColor = isDark ? '#ECEDEE' : '#11181C';
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: insets.top + 10,
        paddingBottom: 10,
        minHeight: 80,
        opacity: headerOpacity,
        transform: [{ translateY: headerTranslateY }],
      }}
    >
      {/* Blur background */}
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        }}
      />
      
      {/* Header content */}
      <XStack
        paddingHorizontal={24}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left side - Avatar */}
        <TouchableOpacity
          ref={profileAvatarRef}
          onPress={onAvatarPress}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#333',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="user" size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* Right side - Notifications and Users */}
        <XStack gap={12} alignItems="center">
          {isAdmin && onUsersPress && (
            <TouchableOpacity
              onPress={onUsersPress}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="users" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
          
          <NotificationBell onPress={onNotificationPress} />
        </XStack>
      </XStack>
    </Animated.View>
  );
};