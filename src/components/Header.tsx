import { Text, YStack, XStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export interface HeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showBack?: boolean;
}

export function Header({ title, leftElement, rightElement, showBack = false }: HeaderProps) {
  const navigation = useNavigation();
  const iconColor = 'white';

  return (
    <XStack
      backgroundColor="$background"
      paddingHorizontal="$0"
      paddingVertical="$3"
      alignItems="center"
      justifyContent="space-between"
      borderBottomColor="$borderColor"
      borderBottomWidth={0}
    >
      {showBack ? (
        <YStack gap="$2" width="100%" alignSelf="stretch">
          <Button
            size="$10"
            backgroundColor="transparent"
            paddingHorizontal="$2"
            marginLeft={-12}
            alignSelf="flex-start"
            onPress={() => navigation.goBack()}
            icon={<Feather name="arrow-left" size={24} color={iconColor} />}
          />
          <XStack alignItems="center" gap="$2" width="100%" flex={1}>
            {leftElement}
            <Text
              fontSize="$6"
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
        <XStack alignItems="center" gap="$2" width="100%" flex={1} alignSelf="stretch">
          {leftElement}
          <Text
            fontSize="$6"
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
}
