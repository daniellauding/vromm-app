# VROMM Tour System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [TourContext Implementation](#tourcontext-implementation)
4. [Tour Content Management](#tour-content-management)
5. [Usage Examples](#usage-examples)
6. [Adding/Removing Tours](#addingremoving-tours)
7. [Troubleshooting](#troubleshooting)

## Overview

The VROMM Tour System provides an interactive, database-driven onboarding experience for new users. It supports multiple languages, role-based content, and dynamic tour steps loaded from the database.

### Key Features
- **Database-driven content** - Tours stored in `content` table
- **Multi-language support** - Content in Swedish and English
- **Role-based filtering** - Different tours for students vs instructors
- **Screen-specific tours** - Context-aware tour steps
- **Progress tracking** - User completion status per tour
- **Performance optimized** - Selective tour enabling to prevent issues

## Database Schema

### Content Table Structure

```sql
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('tour', 'translation', 'banner')),
  key TEXT NOT NULL,
  title JSONB NOT NULL,
  body JSONB,
  target TEXT,
  category TEXT,
  platforms JSONB,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(content_type, key)
);
```

### Tour Content Examples

```sql
-- Basic mobile tour step
INSERT INTO content (
  content_type,
  key,
  title,
  body,
  target,
  category,
  platforms,
  order_index,
  active
) VALUES (
  'tour',
  'tour.mobile.welcome',
  '{"en": "Welcome to VROMM", "sv": "Välkommen till VROMM"}',
  '{"en": "Let us show you around the app", "sv": "Låt oss visa dig runt i appen"}',
  'HomeTab',
  'center',
  '["mobile"]',
  1,
  true
);

-- Instructor-specific tour step
INSERT INTO content (
  content_type,
  key,
  title,
  body,
  target,
  category,
  platforms,
  order_index,
  active
) VALUES (
  'tour',
  'tour.mobile.instructor.dashboard',
  '{"en": "Instructor Dashboard", "sv": "Handledarpanel"}',
  '{"en": "Manage your students and track their progress", "sv": "Hantera dina elever och följ deras framsteg"}',
  'HomeTab',
  'top-right',
  '["mobile"]',
  2,
  true
);

-- Screen-specific tour step
INSERT INTO content (
  content_type,
  key,
  title,
  body,
  target,
  category,
  platforms,
  order_index,
  active
) VALUES (
  'tour',
  'tour.mobile.screen.progress',
  '{"en": "Progress Tracking", "sv": "Framstegsspårning"}',
  '{"en": "Track your learning progress here", "sv": "Följ ditt lärframsteg här"}',
  'ProgressTab',
  'center',
  '["mobile"]',
  3,
  true
);
```

### User Profile Integration

```sql
-- Add tour completion tracking to profiles table
ALTER TABLE profiles ADD COLUMN tour_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN tour_content_hash TEXT;

-- Update tour completion
UPDATE profiles 
SET 
  tour_completed = true,
  tour_content_hash = '2025-01-21T10:30:00Z'
WHERE id = 'user-uuid';
```

## TourContext Implementation

### Core TourContext Features

```typescript
interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps?: TourStep[]) => void;
  startDatabaseTour: (screenContext?: string, userRole?: string) => Promise<void>;
  startCustomTour: (customSteps: TourStep[], tourKey?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  resetTour: () => Promise<void>;
  shouldShowTour: () => Promise<boolean>;
  measureElement: (targetId: string) => Promise<{x: number, y: number, width: number, height: number} | null>;
  updateStepCoords: (stepIndex: number, coords: {x: number, y: number, width: number, height: number}) => void;
  registerElement: (targetId: string, ref: any) => void;
}
```

### Feature Flags

```typescript
// Performance optimization flags
const TOURS_GLOBALLY_ENABLED = false;        // Disable all tours globally
const HOMESCREEN_TOURS_ENABLED = true;       // Allow HomeScreen tours only
```

### Tour Step Interface

```typescript
interface TourStep {
  id: string;
  title: string;
  content: string;
  targetScreen: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'center' | 'left' | 'right';
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  targetCoords?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

## Tour Content Management

### Adding New Tour Steps

#### 1. Database Insertion

```sql
-- Add a new tour step
INSERT INTO content (
  content_type,
  key,
  title,
  body,
  target,
  category,
  platforms,
  order_index,
  active
) VALUES (
  'tour',
  'tour.mobile.new_feature',
  '{"en": "New Feature", "sv": "Ny funktion"}',
  '{"en": "This is how the new feature works", "sv": "Så här fungerar den nya funktionen"}',
  'HomeTab',
  'center',
  '["mobile"]',
  10,
  true
);
```

#### 2. Content Filtering Logic

The system filters tours based on:

**Platform Filtering:**
```typescript
const isMobile = Array.isArray(platforms) && 
  (platforms.includes('mobile') || platforms.includes('both'));
```

**Role-based Filtering:**
```typescript
// Students should not see instructor tours
if (currentUserRole === 'student' && isInstructorTour) {
  return false;
}
```

**Screen Context Filtering:**
```typescript
// For HomeScreen context, only show basic mobile tours
if (screenContext === 'HomeScreen') {
  if (isScreenTour || isInstructorTour) {
    return false;
  }
  return item.key.startsWith('tour.mobile.') && 
    !item.key.includes('screen') && 
    !item.key.includes('conditional');
}
```

### Tour Content Categories

#### Basic Mobile Tours
- `tour.mobile.welcome` - Welcome message
- `tour.mobile.progress` - Progress tracking
- `tour.mobile.create` - Create routes/events
- `tour.mobile.menu` - Menu navigation

#### Instructor-Specific Tours
- `tour.mobile.instructor.dashboard` - Instructor dashboard
- `tour.mobile.instructor.students` - Student management
- `tour.mobile.instructor.analytics` - Analytics overview

#### Screen-Specific Tours
- `tour.mobile.screen.progress` - Progress screen tour
- `tour.mobile.screen.routes` - Routes screen tour
- `tour.mobile.screen.profile` - Profile screen tour

#### Conditional Tours
- `tour.mobile.conditional.first_login` - First login experience
- `tour.mobile.conditional.no_connections` - No connections found
- `tour.mobile.conditional.completed_path` - Path completion

## Usage Examples

### Starting a Tour

```typescript
import { useTour } from '../contexts/TourContext';

function MyComponent() {
  const { startDatabaseTour, startCustomTour } = useTour();
  
  // Start database-driven tour
  const handleStartTour = async () => {
    await startDatabaseTour('HomeScreen', 'student');
  };
  
  // Start custom tour
  const handleStartCustomTour = () => {
    const customSteps = [
      {
        id: 'custom-step-1',
        title: 'Custom Step',
        content: 'This is a custom tour step',
        targetScreen: 'HomeTab',
        position: 'center'
      }
    ];
    startCustomTour(customSteps, 'custom-tour');
  };
  
  return (
    <Button onPress={handleStartTour}>
      Start Tour
    </Button>
  );
}
```

### Tour Element Registration

```typescript
import { useTourTarget } from '../components/TourOverlay';

function MyComponent() {
  const targetRef = useTourTarget('MyComponent.Target');
  
  return (
    <View ref={targetRef}>
      <Text>This element can be targeted by tours</Text>
    </View>
  );
}
```

### Checking Tour Status

```typescript
import { useTour } from '../contexts/TourContext';

function MyComponent() {
  const { shouldShowTour, isActive, currentStep, steps } = useTour();
  const [showTour, setShowTour] = useState(false);
  
  useEffect(() => {
    const checkTour = async () => {
      const shouldShow = await shouldShowTour();
      setShowTour(shouldShow);
    };
    checkTour();
  }, []);
  
  if (showTour && !isActive) {
    return <TourPrompt onStart={() => startDatabaseTour()} />;
  }
  
  return <MyContent />;
}
```

## Adding/Removing Tours

### Adding a New Tour

#### Step 1: Create Database Content

```sql
-- Add tour step to database
INSERT INTO content (
  content_type,
  key,
  title,
  body,
  target,
  category,
  platforms,
  order_index,
  active
) VALUES (
  'tour',
  'tour.mobile.my_new_feature',
  '{"en": "My New Feature", "sv": "Min nya funktion"}',
  '{"en": "Learn about this new feature", "sv": "Lär dig om denna nya funktion"}',
  'HomeTab',
  'center',
  '["mobile"]',
  15,
  true
);
```

#### Step 2: Register Target Element

```typescript
// In your component
import { useTourTarget } from '../components/TourOverlay';

function MyNewFeature() {
  const targetRef = useTourTarget('MyNewFeature.Button');
  
  return (
    <Button ref={targetRef}>
      My New Feature
    </Button>
  );
}
```

#### Step 3: Test the Tour

```typescript
// Reset tour to test new content
const { resetTour } = useTour();
await resetTour();

// Start tour
const { startDatabaseTour } = useTour();
await startDatabaseTour('HomeScreen', 'student');
```

### Removing a Tour

#### Method 1: Deactivate in Database

```sql
-- Deactivate tour step
UPDATE content 
SET active = false 
WHERE key = 'tour.mobile.old_feature';
```

#### Method 2: Delete from Database

```sql
-- Delete tour step completely
DELETE FROM content 
WHERE key = 'tour.mobile.old_feature';
```

#### Method 3: Filter Out in Code

```typescript
// In TourContext.tsx, add filtering logic
const filteredContent = data.filter(item => {
  // Filter out specific tours
  if (item.key === 'tour.mobile.old_feature') {
    return false;
  }
  return true;
});
```

### Updating Tour Content

```sql
-- Update tour content
UPDATE content 
SET 
  title = '{"en": "Updated Title", "sv": "Uppdaterad titel"}',
  body = '{"en": "Updated content", "sv": "Uppdaterat innehåll"}',
  updated_at = NOW()
WHERE key = 'tour.mobile.existing_feature';
```

## Troubleshooting

### Common Issues

#### 1. Tours Not Showing

**Symptoms:**
- `shouldShowTour()` returns false
- Tours don't appear for new users

**Solutions:**
```typescript
// Check tour completion status
const { data: profile } = await supabase
  .from('profiles')
  .select('tour_completed, tour_content_hash')
  .eq('id', user.id)
  .single();

// Reset tour if needed
await resetTour();
```

#### 2. Performance Issues

**Symptoms:**
- Console flooding with tour logs
- App slowdown during tours

**Solutions:**
```typescript
// Disable tours globally
const TOURS_GLOBALLY_ENABLED = false;

// Disable specific tour types
const HOMESCREEN_TOURS_ENABLED = false;
```

#### 3. Tour Content Not Loading

**Symptoms:**
- Empty tour steps
- Fallback tour showing

**Solutions:**
```sql
-- Check content exists and is active
SELECT * FROM content 
WHERE content_type = 'tour' 
AND active = true 
ORDER BY order_index;

-- Check platform filtering
SELECT * FROM content 
WHERE content_type = 'tour' 
AND platforms ? 'mobile'
AND active = true;
```

#### 4. Element Targeting Issues

**Symptoms:**
- Tour steps not positioning correctly
- Elements not found

**Solutions:**
```typescript
// Ensure element is registered
const targetRef = useTourTarget('Unique.Target.Id');

// Check element measurement
const { measureElement } = useTour();
const coords = await measureElement('Unique.Target.Id');
console.log('Element coords:', coords);
```

### Debug Queries

#### Check Tour Status for User

```sql
SELECT 
  p.id,
  p.full_name,
  p.tour_completed,
  p.tour_content_hash,
  c.updated_at as latest_content_update
FROM profiles p
LEFT JOIN (
  SELECT updated_at 
  FROM content 
  WHERE content_type = 'tour' 
  AND active = true 
  ORDER BY updated_at DESC 
  LIMIT 1
) c ON true
WHERE p.id = 'user-uuid';
```

#### Check Available Tour Content

```sql
SELECT 
  key,
  title,
  target,
  category,
  platforms,
  order_index,
  active
FROM content 
WHERE content_type = 'tour' 
AND active = true 
ORDER BY order_index;
```

#### Check Tour Completion Rates

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN tour_completed THEN 1 END) as completed_tours,
  ROUND(
    COUNT(CASE WHEN tour_completed THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as completion_rate
FROM profiles;
```

### Performance Monitoring

```typescript
// Monitor tour performance
const monitorTourPerformance = () => {
  const startTime = performance.now();
  
  startDatabaseTour().then(() => {
    const endTime = performance.now();
    console.log(`Tour load time: ${endTime - startTime}ms`);
  });
};
```

## Best Practices

### Content Creation
1. **Use descriptive keys** - `tour.mobile.screen.progress.tracking`
2. **Include both languages** - Always provide Swedish and English
3. **Set appropriate order** - Use `order_index` for logical flow
4. **Test thoroughly** - Verify on both platforms and roles

### Performance
1. **Use feature flags** - Disable tours when not needed
2. **Limit tour steps** - Keep tours concise and focused
3. **Monitor performance** - Track tour load times and user completion

### User Experience
1. **Progressive disclosure** - Show relevant tours at the right time
2. **Skip options** - Always allow users to skip tours
3. **Context awareness** - Show tours relevant to current screen/role
4. **Completion tracking** - Remember user progress and preferences

---

*This documentation is maintained by the VROMM development team. Last updated: January 2025*
