import { YStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

type ScreenProps = {
  children: ReactNode;
  padding?: boolean;
  scroll?: boolean;
};

export function Screen({ children, padding = true, scroll = true }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '$background' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {scroll ? (
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <YStack 
              f={1} 
              px={padding ? "$6" : undefined}
              py={padding ? "$4" : undefined}
            >
              {children}
            </YStack>
          </ScrollView>
        ) : (
          <YStack 
            f={1} 
            px={padding ? "$6" : undefined}
            py={padding ? "$4" : undefined}
          >
            {children}
          </YStack>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 