import { XStack, Text, YStack, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { NavigationProp } from '../types/navigation';
import { useColorScheme } from 'react-native';

type HeaderProps = {
  title: string;
  showBack?: boolean;
};

export function Header({ title, showBack = true }: HeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return (
    <YStack gap={16}>
      {showBack && (
        <TouchableOpacity onPress={navigation.goBack}>
          <XStack p={8} pl={0}>
            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? theme.gray50?.get() : theme.gray900?.get()} />
          </XStack>
        </TouchableOpacity>
      )}
      
      <Text 
        fontSize={28} 
        fontWeight="800"
        color="$color"
      >
        {title}
      </Text>
    </YStack>
  );
} 