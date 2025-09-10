import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, useColorScheme } from 'react-native';
import { Calendar } from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { AppAnalytics } from '../utils/analytics';

interface EventsBellProps {
  size?: number;
  color?: string;
  onPress?: () => void;
}

export const EventsBell: React.FC<EventsBellProps> = ({ size = 24, color, onPress }) => {
  const navigation = useNavigation();
  const [invitationCount, setInvitationCount] = useState(0);
  const colorScheme = useColorScheme();
  
  // Dynamic color based on theme if not provided
  const iconColor = color || (colorScheme === 'dark' ? '#FFFFFF' : '#000000');

  useEffect(() => {
    loadInvitationCount();

    // Real-time subscription for invitation updates
    const subscription = supabase
      .channel('event-invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `status=eq.invited`,
        },
        () => {
          loadInvitationCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadInvitationCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'invited');

      if (!error) {
        setInvitationCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error loading invitation count:', error);
    }
  };

  const handlePress = () => {
    AppAnalytics.trackButtonPress('events_bell', 'Header', {
      invitation_count: invitationCount,
    }).catch(() => {});

    if (onPress) {
      onPress();
    } else {
      // @ts-expect-error - navigation type issue
      navigation.navigate('Events');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
      <Calendar size={size} color={iconColor} />

      {/* Notification Badge */}
      {invitationCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            backgroundColor: '#EF4444',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#0F172A',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          >
            {invitationCount > 9 ? '9+' : invitationCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};