import React from 'react';
import { XStack } from 'tamagui';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/src/contexts/TranslationContext';

export const HomeHeader = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="$4"
      marginBottom="$2"
    >
      <Text fontSize="$6" fontWeight="800" fontStyle="italic" color="$color">
        {/* Only show name if it's explicitly set and not an email or default value */}
        {profile?.full_name &&
        !profile.full_name.includes('@') &&
        profile.full_name !== 'Unknown' &&
        !profile.full_name.startsWith('user_')
          ? t('home.welcomeWithName').replace('{name}', profile.full_name)
          : t('home.welcome')}
      </Text>

      <Button
        size="sm"
        variant="secondary"
        onPress={() => navigation.navigate('UsersScreen')}
        icon={<Feather name="users" size={18} color={colorScheme === 'dark' ? 'white' : 'black'} />}
      >
        Users
      </Button>
    </XStack>
  );
};
