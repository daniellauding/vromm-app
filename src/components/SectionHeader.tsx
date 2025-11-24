import React, { useState } from 'react';
import { XStack, Button, YStack } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';
import { TouchableOpacity, Modal } from 'react-native';

type SectionHeaderProps = {
  title: string;
  variant?: 'simple' | 'chevron' | 'dropdown';
  onAction?: () => void;
  actionLabel?: string;
  showChevron?: boolean;
  showAction?: boolean;
  showActionLabel?: boolean;
  helpText?: string;
  showHelp?: boolean;
};

// Minimalistic Help Icon Component
export function HelpIcon({ helpText, size = 16 }: { helpText: string; size?: number }) {
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const [showTooltip, setShowTooltip] = useState(false);

  const iconColor = colorScheme === 'dark' ? '#999' : '#666';
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowTooltip(true)}
        style={{ padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="help-circle" size={size} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ maxWidth: 300 }}
          >
            <YStack
              backgroundColor={backgroundColor}
              borderRadius={12}
              padding={16}
              gap={8}
              borderWidth={1}
              borderColor={borderColor}
            >
              <Text fontSize={14} color={textColor} lineHeight={20}>
                {helpText}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTooltip(false)}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
              >
                <Text fontSize={12} color={iconColor} fontWeight="600">
                  Got it
                </Text>
              </TouchableOpacity>
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function SectionHeader({
  title,
  variant = 'simple',
  onAction,
  actionLabel,
  showChevron = true,
  showAction,
  showActionLabel = true,
  helpText,
  showHelp = false,
}: SectionHeaderProps) {
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

  // Show action if explicitly set to true, or if onAction is provided (can show icon-only if showActionLabel is false)
  const shouldShowAction =
    showAction !== undefined ? showAction : !!(onAction && (showActionLabel ? actionLabel : true));
  return (
    <XStack px="$4" pr="$3" py="$0" justifyContent="space-between" alignItems="center">
      <XStack gap="$2" alignItems="center">
        <Text size="md" fontWeight="900" fontStyle="italic">
          {title}
        </Text>
        {(showHelp || helpText) && helpText && <HelpIcon helpText={helpText} size={16} />}
      </XStack>

      <XStack gap="$2" alignItems="center">
        {shouldShowAction && onAction && (
          <Button
            size="sm"
            variant="outlined"
            backgroundColor="transparent"
            borderWidth={0}
            paddingVertical={0}
            paddingHorizontal={0}
            minHeight={0}
            onPress={onAction}
          >
            <XStack gap="$2" alignItems="center">
              {showActionLabel && actionLabel && <Text>{actionLabel}</Text>}
              {showChevron && variant === 'chevron' && (
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colorScheme === 'dark' ? '#CCC' : '#666'}
                />
              )}
              {variant === 'dropdown' && (
                <Feather
                  name="chevron-down"
                  size={20}
                  color={colorScheme === 'dark' ? '#CCC' : '#666'}
                />
              )}
            </XStack>
          </Button>
        )}
      </XStack>
    </XStack>
  );
}
