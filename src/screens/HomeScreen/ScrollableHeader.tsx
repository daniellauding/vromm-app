import React, { useRef, useState, useEffect } from 'react';
import { Animated, View, TouchableOpacity, Image } from 'react-native';
import { XStack } from 'tamagui';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { NotificationBell } from '../../components/NotificationBell';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { supabase } from '../../lib/supabase';

// Progress Circle Component
const ProgressCircle = ({ percent, size = 44, color = '#00E6C3', bg = '#333' }) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
};

interface ScrollableHeaderProps {
  scrollY: Animated.Value;
  onAvatarPress: () => void;
  onNotificationPress: () => void;
  onUsersPress?: () => void;
  isAdmin?: boolean;
  profileAvatarRef?: any;
  userProgress?: number;
}

export const ScrollableHeader: React.FC<ScrollableHeaderProps> = ({
  scrollY,
  onAvatarPress,
  onNotificationPress,
  onUsersPress,
  isAdmin = false,
  profileAvatarRef,
  userProgress = 0,
}) => {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  const { profile } = useAuth();
  const { activeStudentId } = useStudentSwitch();

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
      pointerEvents="box-none"
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
        pointerEvents="none"
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
        pointerEvents="box-none"
      >
        {/* Left side - Avatar with Progress */}
        <View style={{ position: 'relative' }}>
          {/* Progress Circle */}
          {userProgress > 0 && (
            <ProgressCircle
              percent={userProgress}
              size={44}
              color="#00E6C3"
              bg={isDark ? '#333' : '#E5E5E5'}
            />
          )}

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
              borderWidth: activeStudentId ? 2 : 0,
              borderColor: activeStudentId ? '#00E6C3' : 'transparent',
              margin: 2, // Small margin to show progress circle
            }}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Feather name="user" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

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
