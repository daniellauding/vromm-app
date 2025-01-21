import { YStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';

type ScreenProps = {
  children: ReactNode;
  padding?: boolean;
};

export function Screen({ children, padding = true }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '$background' }}>
      <YStack 
        f={1} 
        px={padding ? "$6" : undefined}
        py={padding ? "$4" : undefined}
      >
        {children}
      </YStack>
    </SafeAreaView>
  );
} 