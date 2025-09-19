# Tamagui Theme System Migration Guide

This guide shows how to migrate to the **recommended approach** using Tamagui's built-in theme system with user preference support.

## ✅ **Recommended Approach: Tamagui + User Preferences**

```typescript
import { YStack, Text, Button } from 'tamagui';
import { useTheme } from 'tamagui';
import { useThemePreference } from '../hooks/useThemePreference';

const MyComponent = () => {
  const theme = useTheme(); // Tamagui theme
  const { userPreference, setThemePreference } = useThemePreference(); // User preference
  
  return (
    <YStack backgroundColor="$background" padding="$4">
      <Text color="$color">Content</Text>
      <Button onPress={() => setThemePreference('dark')}>
        Switch to Dark
      </Button>
    </YStack>
  );
};
```

## Migration Steps

### 1. **Replace useColorScheme with Tamagui tokens**

**Before (Old Pattern):**
```typescript
import { useColorScheme } from 'react-native';

const MyComponent = () => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={{ 
      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C'
    }}>
      <Text>Content</Text>
    </View>
  );
};
```

**After (Tamagui Pattern):**
```typescript
import { YStack, Text } from 'tamagui';

const MyComponent = () => {
  return (
    <YStack backgroundColor="$background" padding="$4">
      <Text color="$color">Content</Text>
    </YStack>
  );
};
```

### 2. **Use Tamagui components instead of React Native**

**Before:**
```typescript
import { View, Text, TouchableOpacity } from 'react-native';

<View style={{ backgroundColor: '#fff', padding: 16 }}>
  <Text style={{ color: '#000' }}>Title</Text>
  <TouchableOpacity>
    <Text>Button</Text>
  </TouchableOpacity>
</View>
```

**After:**
```typescript
import { YStack, Text, Button } from 'tamagui';

<YStack backgroundColor="$background" padding="$4">
  <Text color="$color">Title</Text>
  <Button>Button</Button>
</YStack>
```

### 3. **Use theme tokens instead of hardcoded colors**

**Tamagui Theme Tokens:**
```typescript
// Background colors
backgroundColor="$background"        // Main background
backgroundColor="$backgroundHover" // Hover state
backgroundColor="$backgroundPress" // Press state

// Text colors  
color="$color"        // Primary text
color="$colorHover"  // Hover text
color="$gray11"       // Muted text

// Border colors
borderColor="$border"        // Default border
borderColor="$borderHover"   // Hover border
borderColor="$borderFocus"   // Focus border

// Status colors
backgroundColor="$blue4"      // Info
backgroundColor="$red4"       // Error  
backgroundColor="$green4"     // Success
backgroundColor="$yellow4"    // Warning
```

## Complete Example Migration

### **Before (React Native + useColorScheme):**
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';

export function MyCard() {
  const colorScheme = useColorScheme();
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
      borderColor: colorScheme === 'dark' ? '#333' : '#E0E0E0',
      borderWidth: 1,
      padding: 16,
      borderRadius: 8,
    },
    title: {
      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
      fontSize: 18,
      fontWeight: 'bold',
    },
    subtitle: {
      color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280',
      fontSize: 14,
    },
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Title</Text>
      <Text style={styles.subtitle}>Card subtitle</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Action</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### **After (Tamagui + User Preferences):**
```typescript
import React from 'react';
import { YStack, Text, Button } from 'tamagui';
import { useThemePreference } from '../hooks/useThemePreference';

export function MyCard() {
  const { userPreference, setThemePreference } = useThemePreference();
  
  return (
    <YStack 
      backgroundColor="$background"
      borderColor="$border"
      borderWidth={1}
      padding="$4"
      borderRadius="$3"
      gap="$3"
    >
      <Text color="$color" fontSize="$5" fontWeight="bold">
        Card Title
      </Text>
      <Text color="$gray11" fontSize="$3">
        Card subtitle
      </Text>
      <Button onPress={() => setThemePreference('dark')}>
        Switch Theme
      </Button>
    </YStack>
  );
}
```

## User Preference Management

```typescript
import { useThemePreference } from '../hooks/useThemePreference';

const MyComponent = () => {
  const { 
    userPreference,    // 'system' | 'light' | 'dark'
    effectiveTheme,    // 'light' | 'dark' (what's actually applied)
    setThemePreference, // Function to change preference
    isSystem,         // boolean
    isLight,          // boolean  
    isDark            // boolean
  } = useThemePreference();
  
  return (
    <YStack>
      <Text>Current preference: {userPreference}</Text>
      <Text>Effective theme: {effectiveTheme}</Text>
      
      <Button onPress={() => setThemePreference('system')}>
        System Default
      </Button>
      <Button onPress={() => setThemePreference('light')}>
        Force Light
      </Button>
      <Button onPress={() => setThemePreference('dark')}>
        Force Dark
      </Button>
    </YStack>
  );
};
```

## Benefits of This Approach

1. **🎨 Tamagui Integration**: Uses built-in theme system instead of custom colors
2. **⚡ Performance**: Tamagui handles theme switching efficiently
3. **🔧 User Control**: Users can override system theme
4. **📱 System Integration**: Defaults to system preference
5. **🛠️ Maintainable**: Less custom code to maintain
6. **🚀 Future-Proof**: Works with Tamagui updates

## Database Schema

```sql
-- Add theme_preference column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' 
CHECK (theme_preference IN ('system', 'light', 'dark'));
```

## Translation Keys

Add these translation keys for theme settings:

- `profile.theme.system` - "System Default" / "Systemstandard"
- `profile.theme.systemDescription` - "Follow your device's theme setting" / "Följ din enhets temainställning"
- `profile.theme.light` - "Light Mode" / "Ljust läge"
- `profile.theme.lightDescription` - "Clean, bright interface for daytime use" / "Ren, ljus gränssnitt för dagtid"
- `profile.theme.dark` - "Dark Mode" / "Mörkt läge"
- `profile.theme.darkDescription` - "Easy on the eyes for low-light environments" / "Skonsamt för ögonen i svagt ljus"

## Key Files

- `src/hooks/useThemeOverride.ts` - Simple preference hook
- `THEME_PREFERENCE_MIGRATION.sql` - Database migration
- `THEME_TRANSLATIONS.sql` - Translation keys
- `src/components/ExampleTamaguiTheme.tsx` - Usage example
