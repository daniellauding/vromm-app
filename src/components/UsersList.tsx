import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, useColorScheme } from 'react-native';
import { XStack, YStack, ScrollView, View } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';

type User = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  location?: string;
  created_at?: string;
};

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, location, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const navigateToProfile = (userId: string) => {
    navigation.navigate('PublicProfile', { userId });
  };
  
  if (loading) {
    return (
      <XStack padding="$4" justifyContent="center">
        <Text>Loading users...</Text>
      </XStack>
    );
  }
  
  if (users.length === 0) {
    return (
      <XStack padding="$4" justifyContent="center">
        <Text>No users found</Text>
      </XStack>
    );
  }
  
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack space="$4" paddingHorizontal="$4">
        {users.map(user => (
          <TouchableOpacity
            key={user.id}
            onPress={() => navigateToProfile(user.id)}
            activeOpacity={0.8}
          >
            <YStack
              width={130}
              borderRadius={16}
              backgroundColor="$backgroundStrong"
              padding="$3"
              alignItems="center"
              gap="$2"
              borderWidth={1}
              borderColor="$borderColor"
            >
              {/* Avatar */}
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={{ width: 70, height: 70, borderRadius: 35 }}
                />
              ) : (
                <View 
                  style={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: 35, 
                    backgroundColor: colorScheme === 'dark' ? '#444' : '#eee', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  <Feather name="user" size={30} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
                </View>
              )}
              
              {/* Name */}
              <Text
                textAlign="center"
                fontWeight="bold"
                fontSize="$3"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.full_name || 'Unknown'}
              </Text>
              
              {/* Role badge */}
              {user.role && (
                <View
                  style={{
                    backgroundColor: 
                      user.role === 'student' ? '#4B6BFF33' : 
                      user.role === 'instructor' ? '#34C75933' : 
                      '#AF52DE33',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    fontSize="$2"
                    color={
                      user.role === 'student' ? '#4B6BFF' : 
                      user.role === 'instructor' ? '#34C759' : 
                      '#AF52DE'
                    }
                    fontWeight="bold"
                  >
                    {user.role.toUpperCase()}
                  </Text>
                </View>
              )}
              
              {/* Location (if available) */}
              {user.location && (
                <XStack alignItems="center" gap="$1">
                  <Feather name="map-pin" size={10} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
                  <Text fontSize="$2" color="$gray11" numberOfLines={1} ellipsizeMode="tail">
                    {user.location}
                  </Text>
                </XStack>
              )}
            </YStack>
          </TouchableOpacity>
        ))}
      </XStack>
    </ScrollView>
  );
} 