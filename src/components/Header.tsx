import { Text, XStack } from 'tamagui';

export interface HeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Header({ title, leftElement, rightElement }: HeaderProps) {
  return (
    <XStack
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingVertical="$3"
      alignItems="center"
      justifyContent="space-between"
    >
      {leftElement && (
        <XStack alignItems="center">
          {leftElement}
        </XStack>
      )}
      <Text fontSize="$6" fontWeight="600" color="$gray12" flex={1} textAlign="center">
        {title}
      </Text>
      {rightElement && (
        <XStack alignItems="center">
          {rightElement}
        </XStack>
      )}
    </XStack>
  );
} 