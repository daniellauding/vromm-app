import React, { useState, useRef } from 'react';
import { Text, YStack, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Animated, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useThemePreference } from '../hooks/useThemeOverride';

export type HeaderVariant = 'default' | 'sticky' | 'smart' | 'floating';

export interface HeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  variant?: HeaderVariant;
  scrollY?: Animated.Value;
  enableBlur?: boolean;
  blurTint?: 'light' | 'dark' | 'default';
}

export function Header({
  title,
  leftElement,
  rightElement,
  showBack = false,
  onBackPress,
  variant = 'default',
  scrollY,
  enableBlur = false,
  blurTint = 'default',
}: HeaderProps) {
  // Safe navigation hook - may not be available in all contexts
  let navigation = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigation = useNavigation();
  } catch {
    // Navigation not available
  }

  const insets = useSafeAreaInsets();
  const themePref = useThemePreference();
  const isDark = themePref?.effectiveTheme === 'dark';
  const iconColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  
  // Smart header state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Animation values - header should be visible by default
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  
  // Configure scroll listener for smart header
  React.useEffect(() => {
    if (!scrollY || variant !== 'smart') return;
    
    const listener = scrollY.addListener(({ value }) => {
      const currentScrollY = value;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      const shouldHide = isScrollingDown && currentScrollY > 100;
      
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
    
    return () => scrollY.removeListener(listener);
  }, [scrollY, variant, headerOpacity, headerTranslateY, isHeaderVisible]);
  
  // Configure background opacity for sticky/floating variants
  React.useEffect(() => {
    if (!scrollY || (variant !== 'sticky' && variant !== 'floating')) return;
    
    const listener = scrollY.addListener(({ value }) => {
      // Only show background/blur when scrolled past threshold
      const opacity = Math.min(Math.max(value - 50, 0) / 100, 1);
      backgroundOpacity.setValue(opacity);
    });
    
    return () => scrollY.removeListener(listener);
  }, [scrollY, variant, backgroundOpacity]);
  
  // Determine blur tint
  const resolvedBlurTint = blurTint === 'default' ? (isDark ? 'dark' : 'light') : blurTint;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation) {
      navigation.goBack();
    } else {
      console.warn('No navigation or onBackPress available in Header');
    }
  };
  
  const renderHeaderContent = () => (
    <XStack
      backgroundColor={variant === 'default' ? '$background' : 'transparent'}
      paddingHorizontal={24}
      paddingVertical={12}
      alignItems="center"
      justifyContent="space-between"
      borderBottomColor="$borderColor"
      borderBottomWidth={variant === 'default' ? 0 : 0}
    >
      {showBack ? (
        <YStack gap={8} width="100%" alignSelf="stretch">
          <TouchableOpacity
            onPress={handleBackPress}
            style={{
              alignSelf: 'flex-start',
              marginLeft: -8,
              padding: 8,
            }}
          >
            <Feather name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
          <XStack alignItems="center" gap={12} width="100%" flex={1}>
            {leftElement}
            <Text
              fontSize={20}
              fontWeight="800"
              fontStyle="italic"
              color="$color"
              flex={1}
              flexShrink={1}
              textAlign="left"
            >
              {title}
            </Text>
            {Boolean(rightElement) && (
              <XStack alignItems="center" minWidth="auto">
                {rightElement}
              </XStack>
            )}
          </XStack>
        </YStack>
      ) : (
        <XStack alignItems="center" gap={12} width="100%" flex={1} alignSelf="stretch">
          {leftElement}
          <Text
            fontSize={20}
            fontWeight="800"
            fontStyle="italic"
            color="$color"
            flex={1}
            flexShrink={1}
            textAlign="left"
          >
            {title}
          </Text>
          {Boolean(rightElement) && (
            <XStack alignItems="center" minWidth="auto">
              {rightElement}
            </XStack>
          )}
        </XStack>
      )}
    </XStack>
  );
  
  if (variant === 'default') {
    return renderHeaderContent();
  }

  // Sticky header with blur background
  if (variant === 'sticky') {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          paddingTop: insets.top,
        }}
      >
        {enableBlur ? (
          <Animated.View style={{ opacity: backgroundOpacity }}>
            <BlurView
              intensity={80}
              tint={resolvedBlurTint}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </Animated.View>
        ) : (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              opacity: backgroundOpacity,
            }}
          />
        )}
        {renderHeaderContent()}
      </Animated.View>
    );
  }
  
  // Smart header that hides/shows on scroll
  if (variant === 'smart') {
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
        {enableBlur ? (
          <BlurView
            intensity={80}
            tint={resolvedBlurTint}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            }}
          />
        )}
        {renderHeaderContent()}
      </Animated.View>
    );
  }
  
  // Floating header with blur (always visible, subtle background)
  if (variant === 'floating') {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {enableBlur ? (
          <BlurView
            intensity={60}
            tint={resolvedBlurTint}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              opacity: backgroundOpacity,
            }}
          />
        )}
        {renderHeaderContent()}
      </Animated.View>
    );
  }
  
  return renderHeaderContent();
}

// Hook to create scroll-aware Header
export function useHeaderWithScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );
  
  const HeaderComponent = (props: Omit<HeaderProps, 'scrollY'>) => (
    <Header {...props} scrollY={scrollY} />
  );
  
  return { HeaderComponent, onScroll, scrollY };
}