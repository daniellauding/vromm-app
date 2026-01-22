import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { ProgressCircle } from './ProgressCircle';
import { useThemePreference } from '../hooks/useThemeOverride';
import { TheoryModule, getLocalizedText } from '../types/theory';

interface TheoryModuleCardProps {
  module: TheoryModule;
  progress: number;
  sectionsCompleted: number;
  totalSections: number;
  language: 'en' | 'sv';
  onPress: () => void;
  index?: number;
}

export function TheoryModuleCard({
  module,
  progress,
  sectionsCompleted,
  totalSections,
  language,
  onPress,
  index = 0,
}: TheoryModuleCardProps) {
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';

  const isPasswordLocked = module.is_locked && !!module.lock_password;
  const isPaywallLocked = module.paywall_enabled && !isPasswordLocked;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginBottom: 16,
        borderWidth: isPasswordLocked || isPaywallLocked ? 2 : 0,
        borderColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
        borderRadius: 20,
      }}
    >
      <Card
        backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
        borderColor={isDark ? '#232323' : '#E5E5E5'}
        borderWidth={2}
        padding={16}
        borderRadius={16}
        elevate
        shadowOpacity={0}
      >
        <XStack alignItems="center" gap={16}>
          {/* Progress Circle */}
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
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#FF9500',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="lock" size={28} color="#fff" />
              </View>
            ) : (
              <>
                <ProgressCircle
                  percent={progress}
                  size={60}
                  color={isDark ? '#27febe' : '#00C9A7'}
                  bg={isDark ? '#333' : '#E5E5E5'}
                />
                <Text
                  style={{
                    position: 'absolute',
                    textAlign: 'center',
                  }}
                  fontSize={14}
                  color={progress === 1 ? (isDark ? '#27febe' : '#00C9A7') : isDark ? '$gray10' : '#666'}
                  fontWeight="bold"
                >
                  {Math.round(progress * 100)}%
                </Text>
                {progress === 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isDark ? '#27febe' : '#00C9A7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="check" size={14} color="#000" />
                  </View>
                )}
              </>
            )}
          </View>

          {/* Content */}
          <YStack flex={1} gap={4}>
            {/* Badges */}
            <XStack gap={8} flexWrap="wrap">
              {/* Module icon or badge */}
              {module.icon && (
                <Text fontSize={18}>{module.icon}</Text>
              )}

              {isPasswordLocked && (
                <XStack
                  backgroundColor="#FF7300"
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={8}
                  alignItems="center"
                  gap={4}
                >
                  <MaterialIcons name="vpn-key" size={12} color="white" />
                  <Text fontSize={10} color="white" fontWeight="bold">
                    Password
                  </Text>
                </XStack>
              )}

              {isPaywallLocked && (
                <XStack
                  backgroundColor="#00E6C3"
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={8}
                  alignItems="center"
                  gap={4}
                >
                  <Feather name="credit-card" size={10} color="black" />
                  <Text fontSize={10} color="black" fontWeight="bold">
                    ${module.price_usd || 1.0}
                  </Text>
                </XStack>
              )}
            </XStack>

            {/* Title */}
            <Text
              fontSize={16}
              fontWeight="700"
              color={isPasswordLocked ? '#FF9500' : '$color'}
              numberOfLines={2}
            >
              {index + 1}. {getLocalizedText(module.title, language)}
            </Text>

            {/* Description */}
            <Text
              color="$gray11"
              fontSize={13}
              numberOfLines={2}
            >
              {getLocalizedText(module.description, language)}
            </Text>

            {/* Section progress */}
            <XStack alignItems="center" gap={4} marginTop={4}>
              <Feather name="book-open" size={12} color={isDark ? '#888' : '#666'} />
              <Text fontSize={12} color="$gray11">
                {sectionsCompleted}/{totalSections} sections
              </Text>
            </XStack>
          </YStack>

          {/* Arrow */}
          <Feather name="chevron-right" size={20} color={isDark ? '#666' : '#999'} />
        </XStack>
      </Card>
    </TouchableOpacity>
  );
}

export default TheoryModuleCard;
