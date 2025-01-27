import React from 'react';
import { Button, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';

type ChipProps = {
  active?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
  onPress?: () => void;
};

export function Chip({ active, icon, children, onPress }: ChipProps) {
  return (
    <Button
      size="$4"
      backgroundColor={active ? "$blue10" : "$backgroundHover"}
      borderRadius="$6"
      paddingHorizontal="$3"
      paddingVertical="$2"
      onPress={onPress}
    >
      <XStack gap="$2" alignItems="center">
        {icon && (
          <Feather 
            name={icon} 
            size={16} 
            color={active ? "white" : "$gray11"} 
          />
        )}
        <Text 
          color={active ? "white" : "$gray11"} 
          fontSize={16}
          fontWeight={active ? "600" : "400"}
        >
          {children}
        </Text>
      </XStack>
    </Button>
  );
} 