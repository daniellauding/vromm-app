# Onboarding & Navigation Fixes Selective Merge Guide

## Overview
This guide helps you merge ONLY the Interactive Onboarding and Tab Navigation fixes from the `newCreateRouteSheet` branch into main, WITHOUT including RouteWizardSheet.

## Features to Merge
1. **Interactive Onboarding** - New onboarding flow components
2. **Tab Navigation Fixes** - Visibility improvements across all screens
3. **Screen Padding Fixes** - Better spacing and layout adjustments

## Step 1: Add Onboarding Components

### Copy onboarding files:
```bash
# Interactive onboarding components
git checkout newCreateRouteSheet -- src/components/OnboardingInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingModalInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingBackup.tsx
```

## Step 2: Update TabNavigator for Better Visibility

### In `src/components/TabNavigator.tsx`:

#### 1. Add tab bar visibility state (around line 510):
```tsx
// State for hiding tab bar on specific screens
const [isTabBarVisible, setIsTabBarVisible] = useState(true);
```

#### 2. Add visibility control logic (around line 900):
```tsx
useEffect(() => {
  const unsubscribe = navigation.addListener('state', () => {
    const currentRoute = navigation.getState();
    const currentRouteName = currentRoute?.routes[currentRoute.index]?.name;
    
    // List of screens where tab bar should be hidden
    const hideTabBarScreens = [
      'CreateRoute',
      'RouteDetail',
      'ConversationScreen',
      'CreateEvent',
      // Add other full-screen views here
    ];

    const shouldHideTabBar = hideTabBarScreens.includes(currentRouteName || '');
    setIsTabBarVisible(!shouldHideTabBar);
  });

  return unsubscribe;
}, [navigation]);
```

#### 3. Update screen options to use visibility state (around line 960):
```tsx
const screenOptions: import('@react-navigation/bottom-tabs').BottomTabNavigationOptions = {
  headerShown: false,
  tabBarStyle: isTabBarVisible ? tabBarStyle : { display: 'none' },
  // ... rest of options
};
```

#### 4. Fix tab navigation for all screens (commit a60c044 changes):
- Ensure tab navigator properly handles navigation state changes
- Fix tab visibility persistence across screen transitions

## Step 3: Update ActionSheet (WITHOUT RouteWizardSheet)

### In `src/components/ActionSheet.tsx`:

Only update the modal presentation and gesture handling, NOT the RouteWizardSheet parts:

#### 1. Improve gesture handling (if needed):
```tsx
// Better gesture detection for sheet dismissal
const pan = Gesture.Pan()
  .onUpdate((event) => {
    translateY.value = Math.max(0, event.translationY);
  })
  .onEnd(() => {
    if (translateY.value > 150) {
      runOnJS(onClose)();
    } else {
      translateY.value = withSpring(0);
    }
  });
```

## Step 4: Screen Padding Adjustments

### Common padding fixes to apply:

#### For screens with bottom navigation:
```tsx
const BOTTOM_NAV_HEIGHT = 80; // Standard bottom nav height

// In your screen components:
<View style={{ paddingBottom: BOTTOM_NAV_HEIGHT }}>
  {/* Screen content */}
</View>
```

#### For modal sheets and overlays:
```tsx
const { bottom } = useSafeAreaInsets();

// Apply safe area padding
<View style={{ paddingBottom: bottom + 20 }}>
  {/* Content */}
</View>
```

## Step 5: Update Navigation Types (Minimal Changes)

### In `src/types/navigation.ts`:

Only add types needed for onboarding, not wizard-related types:
```tsx
// Add onboarding-related navigation params if needed
export type OnboardingParams = {
  skipable?: boolean;
  returnTo?: string;
};
```

## Files to Cherry-Pick

### From `newCreateRouteSheet` branch:
```bash
# Onboarding components (INCLUDE)
✅ src/components/OnboardingInteractive.tsx
✅ src/components/OnboardingModalInteractive.tsx
✅ src/components/OnboardingBackup.tsx

# Navigation fixes (PARTIAL - only visibility fixes)
⚠️ src/components/TabNavigator.tsx (only visibility logic)
⚠️ src/components/ActionSheet.tsx (only gesture improvements)

# DO NOT INCLUDE
❌ src/components/RouteWizardSheet.tsx
❌ src/components/wizard/* (all wizard step components)
❌ src/components/shared/RouteMapEditor.tsx
❌ src/components/shared/RouteExerciseSelector.tsx
❌ src/components/shared/RouteExercisesSection.tsx
```

## Manual Changes Required

### 1. TabNavigator.tsx
- Add `isTabBarVisible` state
- Add visibility control logic
- Update `screenOptions` to use visibility state
- Remove any `handleMaximizeWizard` references
- Remove any RouteWizardSheet imports

### 2. ActionSheet.tsx
- Keep gesture improvements
- Remove any RouteWizardSheet components
- Remove wizard-related props and handlers

### 3. Screen Components
- Add proper padding for bottom navigation
- Use `BOTTOM_NAV_HEIGHT` constant
- Apply safe area insets where needed

## Testing Checklist

- [ ] Tab bar hides on full-screen views (CreateRoute, RouteDetail, etc.)
- [ ] Tab bar shows on main screens (Home, Explore, Profile)
- [ ] Navigation transitions are smooth
- [ ] No overlap between content and tab bar
- [ ] Onboarding flow works correctly
- [ ] Gesture dismissal works in modals
- [ ] Safe areas respected on all devices
- [ ] No references to RouteWizardSheet remain

## Git Commands for Selective Merge

```bash
# 1. Create a new branch from main
git checkout main
git pull origin main
git checkout -b feature/onboarding-nav-fixes

# 2. Cherry-pick specific files
git checkout newCreateRouteSheet -- src/components/OnboardingInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingModalInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingBackup.tsx

# 3. Manually apply partial changes to TabNavigator and ActionSheet
# (Don't use git checkout for these - edit manually)

# 4. Test thoroughly

# 5. Commit changes
git add .
git commit -m "feat: add interactive onboarding and fix tab navigation visibility"

# 6. Push and create PR
git push origin feature/onboarding-nav-fixes
```

## Common Issues & Solutions

### Issue: Tab bar not hiding on certain screens
**Solution:** Add screen name to `hideTabBarScreens` array in TabNavigator

### Issue: Content overlapping with tab bar
**Solution:** Add `paddingBottom: BOTTOM_NAV_HEIGHT` to screen container

### Issue: Modal sheets not dismissing properly
**Solution:** Check gesture handler configuration and `runOnJS` usage

### Issue: Onboarding not launching
**Solution:** Verify AsyncStorage keys and navigation params

## Rollback Plan

If issues occur:
1. Remove onboarding components
2. Revert TabNavigator changes
3. Remove padding adjustments
4. Test original navigation flow

## Notes

- **DO NOT** include any RouteWizardSheet functionality
- **DO NOT** modify CreateRouteScreen beyond padding fixes
- Focus only on navigation visibility and onboarding
- Test on both iOS and Android
- Verify no performance regressions