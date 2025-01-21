import { XStack, Text, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { NavigationProp } from '../types/navigation';

type HeaderProps = {
  title: string;
  showBack?: boolean;
};

export function Header({ title, showBack = true }: HeaderProps) {
  const navigation = useNavigation<NavigationProp>();

  return (
    <YStack gap={16}>
      {showBack && (
        <TouchableOpacity onPress={navigation.goBack}>
          <XStack p={8} pl={0}>
            <Feather name="arrow-left" size={24} color="$gray12" />
          </XStack>
        </TouchableOpacity>
      )}
      
      <Text 
        fontSize={28} 
        fontWeight="800"
        color="$gray12"
      >
        {title}
      </Text>
    </YStack>
  );
} 