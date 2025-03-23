import { YStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard
} from 'react-native';

type ScreenProps = {
  children: ReactNode;
  padding?: boolean;
  scroll?: boolean;
};

export function Screen({ children, padding = true, scroll = true }: ScreenProps) {
  return (
    <YStack f={1} backgroundColor="$background">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            {scroll ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                <YStack f={1} px={padding ? '$6' : undefined} py={padding ? '$4' : undefined}>
                  {children}
                </YStack>
              </ScrollView>
            ) : (
              <YStack f={1} px={padding ? '$6' : undefined} py={padding ? '$4' : undefined}>
                {children}
              </YStack>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </YStack>
  );
}
