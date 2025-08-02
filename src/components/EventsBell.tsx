import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Calendar } from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';

interface EventsBellProps {
  size?: number;
  color?: string;
}

export const EventsBell: React.FC<EventsBellProps> = ({ size = 24, color = '#FFFFFF' }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('Events');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
      <Calendar size={size} color={color} />
    </TouchableOpacity>
  );
};