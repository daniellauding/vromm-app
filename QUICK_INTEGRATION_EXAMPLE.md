# 🚀 Quick Integration Example

## ✅ Step 1: Dependencies Installed
```bash
npm install expo-notifications react-native-paper lucide-react-native --legacy-peer-deps
```

## ✅ Step 2: Database Ready
All tables exist and functions are set up!

## 📱 Step 3: Add to Your Existing Header

Update your `src/screens/HomeScreen/Header.tsx`:

```tsx
import React from 'react';
import { XStack } from 'tamagui';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

// ADD THESE IMPORTS
import { MessageBell } from '../../components/MessageBell';
import { NotificationBell } from '../../components/NotificationBell';

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
        {profile?.full_name &&
        !profile.full_name.includes('@') &&
        profile.full_name !== 'Unknown' &&
        !profile.full_name.startsWith('user_')
          ? t('home.welcomeWithName').replace('{name}', profile.full_name)
          : t('home.welcome')}
      </Text>

      {/* ADD THIS SECTION - Replace or modify the existing button */}
      <XStack gap={12} alignItems="center">
        <MessageBell size={20} color={colorScheme === 'dark' ? 'white' : 'black'} />
        <NotificationBell size={20} color={colorScheme === 'dark' ? 'white' : 'black'} />
        
        <Button
          size="sm"
          variant="secondary"
          onPress={() => navigation.navigate('UsersScreen')}
          icon={<Feather name="users" size={18} color={colorScheme === 'dark' ? 'white' : 'black'} />}
        >
          Users
        </Button>
      </XStack>
    </XStack>
  );
};
```

## 📱 Step 4: Add Screens to Navigation

In your navigation file (likely `App.tsx` or navigation setup), add:

```tsx
import { 
  MessagesScreen, 
  ConversationScreen, 
  NotificationsScreen, 
  NewMessageScreen 
} from './src/components/messaging';

// In your navigation stack:
<Stack.Screen name="Messages" component={MessagesScreen} />
<Stack.Screen name="Conversation" component={ConversationScreen} />
<Stack.Screen name="Notifications" component={NotificationsScreen} />
<Stack.Screen name="NewMessage" component={NewMessageScreen} />
```

## 📱 Step 5: Wrap App with Provider

In your main App component:

```tsx
import { MessagingProvider } from './src/contexts/MessagingContext';

export default function App() {
  return (
    <MessagingProvider>
      {/* Your existing app structure */}
    </MessagingProvider>
  );
}
```

## 🎯 That's It!

Your messaging system is now fully integrated:

✅ **Message bell** in header with unread count
✅ **Notification bell** in header with unread count  
✅ **Full chat interface** with real-time messaging
✅ **Notifications screen** with deep linking
✅ **Push notifications** ready to go
✅ **Beautiful dark theme** matching your design

The icons will automatically show red badges when you have unread messages or notifications!

## 🧪 Test It

1. Open two devices/simulators with different users
2. Start a conversation 
3. Send messages - you'll see real-time delivery
4. Check the header badges update automatically
5. Tap notifications to navigate to relevant screens

**All working with your existing database!** 🚀 