import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { ProgressCircle } from './ProgressCircle';
import { useThemePreference } from '../hooks/useThemeOverride';

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  youtube_url?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
}

interface LearningPathCardProps {
  path: LearningPath;
  progress: number;
  language: 'en' | 'sv';
  onPress: () => void;
  index?: number;
  alignment?: 'flex-start' | 'center' | 'flex-end';
  width?: string;
}

export function LearningPathCard({
  path,
  progress,
  language,
  onPress,
  index = 0,
  alignment = 'center',
  width = '70%',
}: LearningPathCardProps) {
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';
  const colorScheme = isDark ? 'dark' : 'light';

  const isPasswordLocked = path.is_locked && !!path.lock_password;
  const isPaywallLocked = path.paywall_enabled && !isPasswordLocked;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignSelf: alignment,
        borderWidth: isPasswordLocked || isPaywallLocked ? 2 : 0,
        borderColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
        borderRadius: 24,
        marginBottom: 20,
        shadowOpacity: 0,
        shadowRadius: 0,
      }}
    >
      <Card
        backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
        borderColor={isDark ? '#232323' : '#E5E5E5'}
        borderWidth={3}
        width={width}
        padding={24}
        borderRadius={20}
        elevate
        shadowOpacity={0}
      >
        <YStack alignItems="center" gap={16}>
          {/* Large Progress Circle at Top */}
          <View
            style={{
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPasswordLocked ? (
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: '#FF9500',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="lock" size={40} color="#fff" />
              </View>
            ) : (
              <>
                {/* Large Progress Circle */}
                <ProgressCircle
                  percent={progress}
                  size={90}
                  color={isDark ? '#27febe' : '#00C9A7'}
                  bg={isDark ? '#333' : '#E5E5E5'}
                />

                {/* Percentage Text Inside Circle */}
                <Text
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 90,
                    height: 90,
                    textAlign: 'center',
                    textAlignVertical: 'center',
                    lineHeight: 90,
                  }}
                  fontSize={20}
                  color={
                    progress === 1 ? (isDark ? '#27febe' : '#00C9A7') : isDark ? '$gray10' : '#666'
                  }
                  fontWeight="bold"
                >
                  {Math.round(progress * 100)}%
                </Text>

                {/* Checkmark if completed */}
                {progress === 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: isDark ? '#27febe' : '#00C9A7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="check" size={18} color="#000" />
                  </View>
                )}
              </>
            )}
          </View>

          {/* Title and Badges - Centered */}
          <YStack alignItems="center" gap={8} width="100%">
            {/* Badges Row */}
            <XStack alignItems="center" gap={8} flexWrap="wrap" justifyContent="center">
              {/* Password Badge */}
              {isPasswordLocked && (
                <XStack
                  backgroundColor="#FF7300"
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={12}
                  alignItems="center"
                  gap={4}
                >
                  <MaterialIcons name="vpn-key" size={14} color="white" />
                  <Text fontSize={11} color="white" fontWeight="bold">
                    Password
                  </Text>
                </XStack>
              )}

              {/* Paywall Badge */}
              {isPaywallLocked && (
                <XStack
                  backgroundColor="#00E6C3"
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={12}
                  alignItems="center"
                  gap={4}
                >
                  <Feather name="credit-card" size={12} color="black" />
                  <Text fontSize={11} color="black" fontWeight="bold">
                    ${path.price_usd || 1.0}
                  </Text>
                </XStack>
              )}
            </XStack>

            {/* Title - Centered */}
            <Text
              fontSize={20}
              fontWeight="900"
              fontStyle="italic"
              color={isPasswordLocked ? '#FF9500' : '$color'}
              textAlign="center"
              numberOfLines={2}
            >
              {index + 1}. {path.title[language] || path.title.en}
            </Text>

            {/* Description - Centered */}
            <Text
              color="$gray11"
              fontSize={14}
              textAlign="center"
              numberOfLines={2}
              paddingHorizontal={8}
            >
              {path.description[language] || path.description.en}
            </Text>
          </YStack>
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}
