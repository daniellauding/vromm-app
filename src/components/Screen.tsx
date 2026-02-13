import { YStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  Keyboard,
  StatusBar,
  RefreshControl,
  GestureResponderEvent,
} from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  padding?: boolean;
  scroll?: boolean;
  edges?: Edge[];
  hideStatusBar?: boolean;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
  bottomInset?: number; // extra bottom padding for tab bar spacing
};

export function Screen({
  children,
  padding = true,
  scroll = true,
  edges = ['top'],
  hideStatusBar = false,
  refreshControl,
  bottomInset = 0,
}: ScreenProps) {
  return (
    <YStack f={1} backgroundColor="$background">
      <StatusBar hidden={hideStatusBar} />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View
            style={{ flex: 1 }}
            onTouchStart={(e: GestureResponderEvent) => {
              console.log('🔵 [TOUCH] Screen View touched at:', Math.round(e.nativeEvent.pageX), Math.round(e.nativeEvent.pageY));
              Keyboard.dismiss();
            }}
          >
            {scroll ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={refreshControl}
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </YStack>
  );
}
