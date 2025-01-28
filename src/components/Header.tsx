import { Text, XStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export interface HeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showBack?: boolean;
}

export function Header({ title, leftElement, rightElement, showBack = false }: HeaderProps) {
  const navigation = useNavigation();

  return (
    <XStack
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingVertical="$3"
      alignItems="center"
      justifyContent="space-between"
      borderBottomColor="$borderColor"
      borderBottomWidth={1}
    >
      {(showBack || leftElement) && (
        <XStack alignItems="center" gap="$2" minWidth={40}>
          {showBack && (
            <Button
              size="$3"
              backgroundColor="transparent"
              paddingHorizontal="$2"
              onPress={() => navigation.goBack()}
              icon={<Feather name="arrow-left" size={24} color="$color" />}
            />
          )}
          {leftElement}
        </XStack>
      )}
      <Text fontSize="$6" fontWeight="600" color="$color" flex={1} textAlign="left">
        {title}
      </Text>
      {rightElement && (
        <XStack alignItems="center" minWidth={40}>
          {rightElement}
        </XStack>
      )}
    </XStack>
  );
} 