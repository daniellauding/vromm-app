import React from 'react';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';
import { NavigationProp } from '../types/navigation';

interface ProfileButtonProps {
  userId: string;
  isCurrentUser: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileButton({ userId, isCurrentUser, size = 'md' }: ProfileButtonProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  const handlePress = () => {
    if (isCurrentUser) {
      // Navigate to edit profile
      navigation.navigate('ProfileScreen');
    } else {
      // Navigate to view someone else's profile
      navigation.navigate('PublicProfile', { userId });
    }
  };

  return (
    <Button
      onPress={handlePress}
      icon={
        <Feather 
          name={isCurrentUser ? "edit-2" : "user"} 
          size={size === 'sm' ? 16 : 20} 
          color={iconColor} 
        />
      }
      variant="outlined"
      size={size}
    >
      {isCurrentUser ? (t('profile.edit') || 'Edit') : (t('profile.view') || 'View')}
    </Button>
  );
} 