# Agent Brief: AI Chat UI

**Agent ID:** ai-chat-ui-vromm  
**Phase:** Phase 1 - MVP  
**Duration:** Week 1 (5 days)  
**Branch:** feature/ai-assistant-implementation

---

## Mission

Build the foundational chat interface for the Vromm AI Assistant. Create a clean, performant chat UI that integrates seamlessly with the existing Tamagui-based design system.

---

## Scope

### In Scope ✅
1. **AIChatScreen.tsx** - Main chat screen component
2. **Message Components** - User and assistant message bubbles
3. **Chat Input** - Text input with keyboard handling
4. **Loading States** - Typing indicators, skeleton loaders
5. **Error Handling** - User-friendly error messages
6. **Chat History** - Local persistence (AsyncStorage)
7. **Empty States** - Welcome screen, conversation starters

### Out of Scope ❌
- AI backend integration (handled by ai-backend-vromm agent)
- Settings screen (handled by ai-settings-ui-vromm agent)
- Preview cards for content types (Phase 3)
- Voice input (Phase 4)

---

## Technical Requirements

### Stack
- **Framework:** React Native (Expo)
- **UI Library:** Tamagui
- **Navigation:** React Navigation (already setup)
- **State:** React Context or Zustand
- **Storage:** AsyncStorage (chat history)

### File Structure
```
src/
  screens/
    AIChatScreen.tsx          # Main chat screen
  components/
    ai/
      MessageBubble.tsx        # User/assistant message component
      ChatInput.tsx            # Text input with send button
      TypingIndicator.tsx      # "AI is typing..." animation
      ConversationStarters.tsx # Quick action buttons
      ErrorMessage.tsx         # Error display component
  services/
    aiChatService.ts          # Chat API wrapper (calls backend)
  contexts/
    AIChatContext.tsx         # Chat state management
  types/
    ai.ts                     # TypeScript interfaces
```

### Key Components

#### AIChatScreen.tsx
```typescript
import { Screen, YStack, XStack } from 'tamagui';
import { FlatList } from 'react-native';

export function AIChatScreen() {
  return (
    <Screen>
      <Header title="AI Assistant" />
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} />}
        keyExtractor={(item) => item.id}
        inverted
      />
      <ChatInput onSend={handleSend} />
    </Screen>
  );
}
```

#### MessageBubble.tsx
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <XStack
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      paddingHorizontal="$4"
      paddingVertical="$2"
    >
      <YStack
        backgroundColor={isUser ? '$blue10' : '$gray3'}
        borderRadius="$4"
        padding="$3"
        maxWidth="80%"
      >
        <Text color={isUser ? 'white' : '$gray12'}>{message.content}</Text>
        <Text fontSize="$1" color="$gray10" marginTop="$1">
          {formatTime(message.timestamp)}
        </Text>
      </YStack>
    </XStack>
  );
}
```

#### ChatInput.tsx
```typescript
export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  
  return (
    <XStack
      padding="$3"
      borderTopWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <Input
        flex={1}
        value={text}
        onChangeText={setText}
        placeholder="Skriv ditt meddelande..."
        multiline
        maxHeight={100}
      />
      <Button
        onPress={() => {
          if (text.trim()) {
            onSend(text);
            setText('');
          }
        }}
        disabled={!text.trim()}
        marginLeft="$2"
      >
        Skicka
      </Button>
    </XStack>
  );
}
```

---

## Integration Points

### Navigation
Add route to `src/types/navigation.ts`:
```typescript
export type RootStackParamList = {
  // ... existing routes
  AIChat: undefined;
};
```

### Entry Points
Add "Ask AI" buttons to existing screens (to be determined):
- Dashboard (floating button)
- Learning paths (inline button)
- Route screen (header button)

---

## Performance Requirements

- **FlatList optimization:** Use `getItemLayout` for fixed-height messages
- **Keyboard handling:** Dismiss on scroll, auto-scroll to latest message
- **Message rendering:** Memoize MessageBubble with React.memo
- **Large histories:** Paginate (load 50 messages at a time)

---

## Design Guidelines

### Colors (Dark Mode)
- User messages: `$blue10` background, white text
- AI messages: `$gray3` background, `$gray12` text
- Input border: `$borderColor`
- Error messages: `$red10` background

### Spacing
- Message padding: `$3` (12px)
- Screen padding: `$4` (16px)
- Message vertical gap: `$2` (8px)

### Typography
- Message text: `$body` (16px)
- Timestamp: `$caption` (12px)
- Input placeholder: `$gray10`

---

## Testing Checklist

- [ ] Messages render correctly (user vs assistant)
- [ ] Keyboard dismisses on scroll
- [ ] Send button disabled when input empty
- [ ] Chat history persists across sessions
- [ ] Error messages display correctly
- [ ] Typing indicator animates smoothly
- [ ] Long messages wrap properly
- [ ] Timestamps format correctly (Swedish locale)

---

## Acceptance Criteria

1. ✅ Chat screen renders with proper layout
2. ✅ Messages display with correct styling (user vs AI)
3. ✅ Input field works with multiline support
4. ✅ Send button triggers message send
5. ✅ Chat history saved to AsyncStorage
6. ✅ Typing indicator shows during AI response
7. ✅ Error states handled gracefully
8. ✅ Keyboard behavior is smooth

---

## Dependencies

**Blocked by:** None (greenfield)  
**Blocks:** ai-backend-vromm (needs UI to test integration)

---

## Deliverables

1. `src/screens/AIChatScreen.tsx` - Main chat screen
2. `src/components/ai/MessageBubble.tsx` - Message component
3. `src/components/ai/ChatInput.tsx` - Input component
4. `src/components/ai/TypingIndicator.tsx` - Loading state
5. `src/contexts/AIChatContext.tsx` - State management
6. `src/services/aiChatService.ts` - API wrapper (stub for now)
7. `src/types/ai.ts` - TypeScript interfaces

**Total estimated:** ~800 lines of code

---

## Notes

- Use existing Tamagui components (Button, Input, Text, etc.)
- Match design system from existing screens (ProfileScreen, DailyStatus)
- Prioritize performance (FlatList optimization critical)
- Keep state management simple (Context API sufficient for MVP)

---

**Status:** 🟢 Ready to start  
**Priority:** P0 (blocking backend work)  
**Estimated Time:** 2-3 days
