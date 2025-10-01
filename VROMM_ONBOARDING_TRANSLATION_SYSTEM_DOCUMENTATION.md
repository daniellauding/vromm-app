# VROMM Onboarding & Translation System Documentation

## Overview

This document provides comprehensive documentation for the VROMM onboarding system and translation infrastructure, including current components, database structure, and implementation details.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Onboarding Components](#onboarding-components)
3. [Translation System](#translation-system)
4. [Database Schema](#database-schema)
5. [Implementation Details](#implementation-details)
6. [User Flows](#user-flows)
7. [Technical Specifications](#technical-specifications)
8. [Troubleshooting](#troubleshooting)

## System Architecture

### Current Active Components

The VROMM app uses a multi-layered onboarding system with the following active components:

#### 1. **OnboardingInteractive.tsx** (Primary Component)
- **Purpose**: Main interactive onboarding flow for new users
- **Location**: `src/components/OnboardingInteractive.tsx`
- **Features**:
  - Step-by-step guided setup
  - Location permissions
  - License plan selection
  - Role selection (student/instructor)
  - User connections and invitations
  - Vehicle and transmission preferences
  - Language selection
  - Goal setting

#### 2. **OnboardingScreen.tsx** (Screen Wrapper)
- **Purpose**: Screen-level wrapper for onboarding
- **Location**: `src/screens/OnboardingScreen.tsx`
- **Features**:
  - Navigation handling
  - Onboarding completion logic
  - Error boundary integration

#### 3. **Onboarding.tsx** (Legacy Component)
- **Purpose**: Legacy onboarding slides component
- **Location**: `src/components/Onboarding.tsx`
- **Status**: Legacy - not actively used in current flow
- **Features**: Static slide-based onboarding

#### 4. **OnboardingModal.tsx** (Modal Wrapper)
- **Purpose**: Modal wrapper for onboarding
- **Location**: `src/components/OnboardingModal.tsx`
- **Status**: Legacy - not actively used in current flow

### Translation System

#### **TranslationService.ts** (Core Service)
- **Purpose**: Centralized translation management
- **Location**: `src/services/translationService.ts`
- **Features**:
  - Multi-language support (English/Swedish)
  - Caching system
  - Version management
  - Platform-specific translations
  - Real-time updates

## Onboarding Components

### OnboardingInteractive.tsx

#### Key Features

1. **Step Management**
   ```typescript
   interface OnboardingStep {
     id: string;
     title: string;
     description: string;
     icon: string;
     type: 'permission' | 'action' | 'selection' | 'info';
     completed?: boolean;
     actionButton?: string;
     skipButton?: string;
   }
   ```

2. **Gesture Handling**
   - Pan gestures for modal interactions
   - Snap points for modal positioning
   - Animated transitions using Reanimated

3. **User Data Collection**
   - Location permissions and city selection
   - License plan preferences
   - Role selection (student/instructor)
   - Vehicle preferences
   - Language selection
   - Goal setting

4. **Connection System**
   - User search and invitation
   - Relationship management
   - Real-time updates

#### Implementation Details

```typescript
// Gesture handling for connections modal
const { height } = Dimensions.get('window');
const connectionsTranslateY = useSharedValue(height);
const connectionsBackdropOpacityShared = useSharedValue(0);

const connectionsSnapPoints = useMemo(() => {
  const points = {
    large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
    medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
    small: height * 0.7,   // Top at 70% of screen (show 30% - small)
    mini: height * 0.85,   // Top at 85% of screen (show 15% - just title)
    dismissed: height,     // Completely off-screen
  };
  return points;
}, [height]);
```

### OnboardingScreen.tsx

#### Key Features

1. **Navigation Management**
   - Safe navigation to main app
   - Error handling
   - Loading states

2. **Onboarding Logic**
   - Completion tracking
   - Skip functionality
   - Progress persistence

## Translation System

### TranslationService.ts

#### Core Functions

1. **Translation Management**
   ```typescript
   export const fetchTranslations = async (
     language: Language = 'en',
     forceRefresh = false,
   ): Promise<Record<string, string>>
   ```

2. **Caching System**
   ```typescript
   export const cacheTranslations = async (
     language: Language,
     translations: Record<string, string>,
   ): Promise<void>
   ```

3. **Version Management**
   ```typescript
   export const checkTranslationsVersion = async (): Promise<boolean>
   ```

4. **Language Management**
   ```typescript
   export const getCurrentLanguage = async (): Promise<Language>
   export const setCurrentLanguage = async (language: Language): Promise<void>
   ```

#### Translation Keys Structure

The system uses hierarchical translation keys:

```
onboarding.location.enableLocation
onboarding.role.student
onboarding.connections.tapToRemove
profile.manageStudents
auth.signIn.passwordLabel
```

## Database Schema

### Translations Table

```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR NOT NULL,
  language VARCHAR NOT NULL,
  value TEXT NOT NULL,
  platform VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Key Categories

1. **Onboarding Translations**
   - `onboarding.*` - Onboarding flow text
   - `onboarding.location.*` - Location-related text
   - `onboarding.role.*` - Role selection text
   - `onboarding.connections.*` - Connection management text

2. **Authentication Translations**
   - `auth.*` - Authentication flow text
   - `auth.signIn.*` - Sign-in specific text
   - `auth.signUp.*` - Sign-up specific text

3. **Profile Translations**
   - `profile.*` - Profile management text
   - `profile.manageStudents.*` - Student management text

4. **Navigation Translations**
   - `nav.*` - Navigation elements
   - `navigation.*` - Navigation components

### Sample Translation Data

```sql
-- Onboarding translations
INSERT INTO translations (key, language, value, platform) VALUES
('onboarding.location.enableLocation', 'en', 'Enable Location', 'mobile'),
('onboarding.location.enableLocation', 'sv', 'Aktivera plats', 'mobile'),
('onboarding.role.student', 'en', 'Student', 'mobile'),
('onboarding.role.student', 'sv', 'Elev', 'mobile');

-- Authentication translations
INSERT INTO translations (key, language, value, platform) VALUES
('auth.signIn.passwordLabel', 'en', 'Password', 'mobile'),
('auth.signIn.passwordLabel', 'sv', 'Lösenord', 'mobile'),
('auth.signUp.confirmPasswordLabel', 'en', 'Confirm Password', 'mobile'),
('auth.signUp.confirmPasswordLabel', 'sv', 'Bekräfta lösenord', 'mobile');
```

## Implementation Details

### Onboarding Flow

1. **Initialization**
   ```typescript
   const shouldShowInteractiveOnboarding = async (
     key = 'interactive_onboarding',
     userId?: string,
   ): Promise<boolean>
   ```

2. **Step Completion**
   ```typescript
   const completeOnboardingWithVersion = async (
     key = 'interactive_onboarding',
     userId?: string,
   ): Promise<void>
   ```

3. **Progress Tracking**
   - AsyncStorage for local persistence
   - Supabase for server-side tracking
   - Version management for updates

### Translation Loading

1. **Initial Load**
   ```typescript
   const loadTranslations = async () => {
     const language = await getCurrentLanguage();
     const translations = await fetchTranslations(language);
     return translations;
   };
   ```

2. **Caching Strategy**
   - Local cache for offline access
   - Version checking for updates
   - Platform-specific translations

3. **Real-time Updates**
   - Subscription to translation changes
   - Automatic refresh on updates
   - Fallback to cached translations

## User Flows

### New User Onboarding

1. **App Launch**
   - Check if onboarding is needed
   - Load user preferences
   - Initialize translation system

2. **Step-by-Step Setup**
   - Location permissions
   - License plan selection
   - Role selection
   - User connections
   - Preferences setup

3. **Completion**
   - Save preferences to database
   - Mark onboarding as complete
   - Navigate to main app

### Translation Loading

1. **App Initialization**
   - Load cached translations
   - Check for updates
   - Set current language

2. **Language Switching**
   - Update current language
   - Fetch new translations
   - Update UI components

3. **Real-time Updates**
   - Subscribe to translation changes
   - Update UI automatically
   - Maintain consistency

## Technical Specifications

### Performance Considerations

1. **Translation Caching**
   - Local storage for offline access
   - Efficient key-value lookups
   - Minimal memory footprint

2. **Onboarding Optimization**
   - Lazy loading of components
   - Efficient state management
   - Smooth animations

3. **Database Optimization**
   - Indexed translation keys
   - Efficient queries
   - Caching strategies

### Error Handling

1. **Translation Fallbacks**
   - Default language fallback
   - Key fallback for missing translations
   - Error logging and monitoring

2. **Onboarding Error Recovery**
   - Step validation
   - Error boundaries
   - User-friendly error messages

### Security Considerations

1. **Translation Security**
   - Input validation
   - XSS prevention
   - Content sanitization

2. **Onboarding Security**
   - User data validation
   - Permission handling
   - Privacy compliance

## Troubleshooting

### Common Issues

1. **Missing Dimensions Import**
   ```typescript
   // Error: Property 'Dimensions' doesn't exist
   // Solution: Add import
   import { Dimensions } from 'react-native';
   ```

2. **Translation Loading Issues**
   ```typescript
   // Check translation service
   const debugTranslations = async (): Promise<void> => {
     console.log('Translation Debug Info');
   };
   ```

3. **Onboarding State Issues**
   ```typescript
   // Reset onboarding state
   const resetOnboarding = async (key = 'interactive_onboarding'): Promise<void> => {
     await AsyncStorage.removeItem(key);
   };
   ```

### Debug Tools

1. **Translation Debug**
   ```typescript
   export const debugTranslations = async (): Promise<void> => {
     // Debug translation loading and caching
   };
   ```

2. **Onboarding Debug**
   ```typescript
   const debugOnboarding = () => {
     // Debug onboarding state and progress
   };
   ```

## Future Enhancements

### Planned Features

1. **Enhanced Onboarding**
   - Video tutorials
   - Interactive demos
   - Progress analytics

2. **Translation Improvements**
   - Machine translation
   - Community translations
   - Real-time collaboration

3. **Performance Optimizations**
   - Lazy loading
   - Bundle splitting
   - Caching improvements

### Integration Points

1. **Analytics Integration**
   - Onboarding completion rates
   - Translation usage statistics
   - User behavior tracking

2. **A/B Testing**
   - Onboarding flow variations
   - Translation effectiveness
   - User experience optimization

## Conclusion

The VROMM onboarding and translation system provides a comprehensive foundation for user onboarding and internationalization. The system is designed for scalability, performance, and user experience, with robust error handling and debugging capabilities.

The current implementation successfully handles:
- Multi-step interactive onboarding
- Real-time translation management
- User preference persistence
- Cross-platform compatibility
- Performance optimization

Future enhancements will focus on improving user experience, adding advanced features, and optimizing performance across all supported platforms.
