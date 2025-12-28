import React, { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  TouchableOpacityProps,
} from 'react-native';
import { YStack, useTheme } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useTranslation } from '../contexts/TranslationContext';

interface HelpInfoProps {
  helpText: string;
  helpTextSwedish?: string;
  titleText?: string;
  titleTextSwedish?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  touchableProps?: TouchableOpacityProps;
}

export function HelpInfo({
  helpText,
  helpTextSwedish,
  titleText,
  titleTextSwedish,
  buttonText,
  onButtonPress,
  icon = 'help-circle',
  iconSize = 16,
  iconColor,
  backgroundColor,
  borderColor,
  textColor,
  touchableProps,
}: HelpInfoProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const theme = useTheme();
  const { effectiveTheme } = useThemePreference();
  const { language } = useTranslation();
  const colorScheme = effectiveTheme || 'light';
  
  // Smart defaults based on theme
  const bgColor = backgroundColor || (colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF');
  const bdColor = borderColor || (colorScheme === 'dark' ? '#333' : '#E5E5E5');
  const txtColor = textColor || (colorScheme === 'dark' ? '#FFF' : '#000');
  const icnColor = iconColor || (colorScheme === 'dark' ? '#999' : '#666');
  
  // Smart translation handling
  const displayHelpText = (language === 'sv' && helpTextSwedish) ? helpTextSwedish : helpText;
  const displayTitleText = (language === 'sv' && titleTextSwedish) ? titleTextSwedish : titleText;
  const displayButtonText = buttonText || (language === 'sv' ? 'Förstått' : 'Got it');

  const handleClose = () => {
    setShowTooltip(false);
    onButtonPress?.();
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowTooltip(true)}
        style={{ padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        {...touchableProps}
      >
        <Feather name={icon} size={iconSize} color={icnColor} />
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
              backgroundColor={bgColor}
              borderRadius={12}
              padding={16}
              gap={8}
              borderWidth={1}
              borderColor={bdColor}
            >
              {displayTitleText && (
                <Text fontSize={16} color={txtColor} fontWeight="600" marginBottom={4}>
                  {displayTitleText}
                </Text>
              )}
              <Text fontSize={14} color={txtColor} lineHeight={20}>
                {displayHelpText}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
              >
                <Text fontSize={12} color={icnColor} fontWeight="600">
                  {displayButtonText}
                </Text>
              </TouchableOpacity>
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}