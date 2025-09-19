import React from 'react';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useTheme } from 'tamagui';
import { useThemePreference } from '../hooks/useThemeOverride';

/**
 * Example component showing how to use Tamagui theme system with user preferences
 * 
 * This demonstrates the recommended approach:
 * 1. Use Tamagui's built-in theme tokens ($background, $color, etc.)
 * 2. Use useThemePreference() for user preference logic
 * 3. Let Tamagui handle all the color definitions and theme switching
 */
export function ExampleTamaguiTheme() {
  const theme = useTheme(); // Tamagui theme object
  const { userPreference, effectiveTheme, setThemePreference } = useThemePreference();

  return (
    <YStack 
      backgroundColor="$background" 
      padding="$4" 
      borderRadius="$4"
      borderWidth={1}
      borderColor="$border"
      gap="$3"
    >
      {/* Header */}
      <Text fontSize="$6" fontWeight="bold" color="$color">
        Theme Example
      </Text>
      
      {/* Content using Tamagui theme tokens */}
      <Text color="$color" fontSize="$4">
        This component uses Tamagui's theme system with user preferences!
      </Text>
      
      <Text color="$gray11" fontSize="$3">
        Current preference: {userPreference}
      </Text>
      
      <Text color="$gray11" fontSize="$3">
        Effective theme: {effectiveTheme}
      </Text>
      
      {/* Theme controls */}
      <XStack gap="$2" flexWrap="wrap">
        <Button
          size="$3"
          variant={userPreference === 'system' ? 'outlined' : 'outlined'}
          backgroundColor={userPreference === 'system' ? '$blue4' : undefined}
          onPress={() => setThemePreference('system')}
        >
          System
        </Button>
        
        <Button
          size="$3"
          variant={userPreference === 'light' ? 'outlined' : 'outlined'}
          backgroundColor={userPreference === 'light' ? '$blue4' : undefined}
          onPress={() => setThemePreference('light')}
        >
          Light
        </Button>
        
        <Button
          size="$3"
          variant={userPreference === 'dark' ? 'outlined' : 'outlined'}
          backgroundColor={userPreference === 'dark' ? '$blue4' : undefined}
          onPress={() => setThemePreference('dark')}
        >
          Dark
        </Button>
      </XStack>
      
      {/* Show theme values */}
      <YStack gap="$2" padding="$3" backgroundColor="$gray2" borderRadius="$3">
        <Text fontSize="$2" color="$gray11" fontWeight="500">
          Tamagui Theme Values:
        </Text>
        <Text fontSize="$2" color="$gray11">
          Background: {theme.background?.val}
        </Text>
        <Text fontSize="$2" color="$gray11">
          Text: {theme.color?.val}
        </Text>
        <Text fontSize="$2" color="$gray11">
          Border: {theme.borderColor?.val}
        </Text>
      </YStack>
    </YStack>
  );
}
