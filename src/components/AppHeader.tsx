import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { XStack, Input } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

interface AppHeaderProps {
  onLocateMe: () => void;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  }
});

export function AppHeader({ onLocateMe }: AppHeaderProps) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  return (
    <XStack style={styles.container} gap="$2">
      <Input
        flex={1}
        placeholder="Search cities, addresses, routes..."
        backgroundColor="$background"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$2"
        height="$10"
        paddingLeft="$3"
        fontSize="$2"
        onFocus={() => {
          // Navigate to search screen when input is focused
          navigation.navigate('Search');
        }}
        editable={false} // Make input non-editable since we're using it as a button
      />
      <XStack
        backgroundColor="$background"
        borderRadius="$2"
        width="$10"
        height="$10"
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="$borderColor"
        onPress={onLocateMe}
        pressStyle={{ opacity: 0.7 }}
      >
        <Feather name="navigation" size={20} color={iconColor} />
      </XStack>
    </XStack>
  );
} 