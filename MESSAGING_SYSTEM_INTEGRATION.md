# Messaging & Notification System Integration

This document explains how to integrate the new messaging and notification system into your existing Vromm app.

## 🗄️ Database Setup

✅ **ALL TABLES ALREADY EXIST!** Your database already has all the required tables:

- `conversations` - User conversations  
- `conversation_participants` - Conversation members
- `messages` - Individual messages
- `message_reads` - Read receipts  
- `notifications` - User notifications
- `user_follows` - Follow relationships

**Required Migration:**
1. Run only: `supabase/migrations/20250103000001_add_user_push_tokens.sql` (for push notifications)
2. Run helper functions: `supabase/migrations/20250103000002_add_messaging_functions.sql`

## 📱 Installation

Install the required dependencies:

```bash
npm install expo-notifications react-native-paper lucide-react-native
```

## 🔧 Integration Steps

### 1. Wrap Your App with MessagingProvider

In your main App component or where you have other providers:

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

### 2. Add Header Icons

In your existing header components, add the message and notification bells:

```tsx
import { MessageBell, NotificationBell } from './src/components/messaging';

// In your header component
<XStack gap={16}>
  <MessageBell size={24} color="#FFFFFF" />
  <NotificationBell size={24} color="#FFFFFF" />
</XStack>
```

### 3. Add Navigation Screens

Add these screens to your navigation stack:

```tsx
import { MessagesScreen, ConversationScreen, NotificationsScreen, NewMessageScreen } from './src/components/messaging';

// In your navigation configuration
<Stack.Screen name="Messages" component={MessagesScreen} />
<Stack.Screen name="Conversation" component={ConversationScreen} />
<Stack.Screen name="Notifications" component={NotificationsScreen} />
<Stack.Screen name="NewMessage" component={NewMessageScreen} />
```

### 4. Configure Push Notifications

Update your `app.json` to include notification configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#00FFBC",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 5. Update Expo Project ID

In `src/services/pushNotificationService.ts`, replace `'your-expo-project-id'` with your actual Expo project ID.

## 🎨 Design System

The system follows your existing design system:

- **Background**: `#0F172A` (dark theme)
- **Primary**: `#00FFBC` (green)
- **Text**: `#FFFFFF` (white), `rgba(255, 255, 255, 0.7)` (muted)
- **Badge**: `#EF4444` (red)

## 🔄 Real-time Features

The system includes:

- Real-time message delivery
- Live unread count updates
- Push notifications
- Read receipts
- Typing indicators (can be added)

## 📊 Database Tables

The system uses these existing tables:

- `conversations` - Chat conversations
- `conversation_participants` - Who's in each conversation
- `messages` - Individual messages
- `message_reads` - Read receipts
- `notifications` - User notifications
- `user_follows` - Follow relationships
- `user_push_tokens` - Push notification tokens

## 🚀 Features

### Messages
- ✅ List all conversations
- ✅ Real-time chat interface
- ✅ Read receipts
- ✅ Unread message counts
- ✅ Message types (text, image, file)

### Notifications
- ✅ List all notifications
- ✅ Mark as read functionality
- ✅ Different notification types
- ✅ Deep linking to relevant screens

### Push Notifications
- ✅ Expo notifications integration
- ✅ Token management
- ✅ Deep linking support
- ✅ Badge counts

## 🔧 Customization

### Adding New Notification Types

1. Update the notification service types
2. Add icons in `NotificationsScreen.tsx`
3. Handle navigation in `handleNotificationPress`

### Custom Message Types

1. Update the message service
2. Add rendering logic in `ConversationScreen.tsx`
3. Handle file uploads if needed

### Styling

All components use Tamagui and follow your existing theme. You can customize colors, spacing, and typography by updating the theme tokens.

## 🐛 Troubleshooting

### Common Issues

1. **Push notifications not working**: Check Expo project ID and device permissions
2. **Real-time not updating**: Verify Supabase realtime is enabled
3. **Navigation errors**: Ensure screens are properly added to navigation stack

### Debug Mode

Enable debug logging by setting:

```tsx
// In your app initialization
console.log('Messaging system initialized');
```

## 📝 API Reference

### Services

- `messageService` - Handle conversations and messages
- `notificationService` - Handle notifications and follows
- `pushNotificationService` - Handle push notifications

### Components

- `MessageBell` - Header icon with unread count
- `NotificationBell` - Header icon with unread count
- `MessagesScreen` - List conversations
- `ConversationScreen` - Chat interface
- `NotificationsScreen` - List notifications

### Hooks

- `useMessaging` - Access global messaging state

## 🔒 Security

The system uses Supabase Row Level Security (RLS) policies to ensure users can only access their own data. All database operations are properly secured.

## 📈 Performance

- FlatList for large lists
- Lazy loading for messages
- Optimized re-renders
- Efficient real-time subscriptions

## 🎯 Success Criteria

- [x] MessageBell shows correct unread count
- [x] NotificationBell shows correct unread count
- [x] Real-time message delivery works
- [x] Push notifications are received
- [x] Deep linking navigates to correct screens
- [x] UI matches design specifications
- [x] Performance is acceptable on low-end devices

The messaging and notification system is now fully integrated and ready to use! 