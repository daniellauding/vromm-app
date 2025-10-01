# Onboarding Modal Reset Guide

This guide shows how to restore the onboarding modal functionality that was removed from `HomeScreen/index.tsx`.

## What Was Removed

The following components and functionality were removed from `src/screens/HomeScreen/index.tsx`:

### 1. Removed Imports
```typescript
// These imports were removed:
import { OnboardingModalInteractive } from '../components/OnboardingModalInteractive';
```

### 2. Removed State Variables
```typescript
// These state variables were removed:
const [showOnboarding, setShowOnboarding] = useState(false);
const [isFirstLogin, setIsFirstLogin] = useState(false);
```

### 3. Removed useEffect for Onboarding Logic
```typescript
// This useEffect was removed:
useEffect(() => {
  const checkFirstLogin = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setIsFirstLogin(true);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };
  
  checkFirstLogin();
}, []);
```

### 4. Removed Onboarding Modal Component
```typescript
// This component was removed from the JSX:
{showOnboarding && (
  <OnboardingModalInteractive
    visible={showOnboarding}
    onClose={() => {
      setShowOnboarding(false);
      setIsFirstLogin(false);
      AsyncStorage.setItem('hasSeenOnboarding', 'true');
    }}
  />
)}
```

### 5. Removed Debug Functions
```typescript
// These debug functions were removed:
const resetOnboarding = async () => {
  await AsyncStorage.removeItem('hasSeenOnboarding');
  setShowOnboarding(true);
  setIsFirstLogin(true);
};

const showOnboardingDebug = () => {
  setShowOnboarding(true);
  setIsFirstLogin(true);
};
```

## How to Restore

### Step 1: Add Back Imports
Add this import at the top of `src/screens/HomeScreen/index.tsx`:
```typescript
import { OnboardingModalInteractive } from '../components/OnboardingModalInteractive';
```

### Step 2: Add Back State Variables
Add these state variables in the component:
```typescript
const [showOnboarding, setShowOnboarding] = useState(false);
const [isFirstLogin, setIsFirstLogin] = useState(false);
```

### Step 3: Add Back useEffect
Add this useEffect for onboarding logic:
```typescript
useEffect(() => {
  const checkFirstLogin = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setIsFirstLogin(true);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };
  
  checkFirstLogin();
}, []);
```

### Step 4: Add Back Onboarding Modal
Add this component in the JSX (before the closing `</View>`):
```typescript
{showOnboarding && (
  <OnboardingModalInteractive
    visible={showOnboarding}
    onClose={() => {
      setShowOnboarding(false);
      setIsFirstLogin(false);
      AsyncStorage.setItem('hasSeenOnboarding', 'true');
    }}
  />
)}
```

### Step 5: Add Back Debug Functions (Optional)
If you want debug functions for testing:
```typescript
const resetOnboarding = async () => {
  await AsyncStorage.removeItem('hasSeenOnboarding');
  setShowOnboarding(true);
  setIsFirstLogin(true);
};

const showOnboardingDebug = () => {
  setShowOnboarding(true);
  setIsFirstLogin(true);
};
```

### Step 6: Update Tour Logic (if needed)
If you had tour logic that depended on onboarding state, you may need to restore those dependencies.

## Files That Need to Exist

Make sure these files exist:
- `src/components/OnboardingModalInteractive.tsx` - The onboarding modal component
- Any related onboarding components or utilities

## Testing

After restoration:
1. Clear app data or uninstall/reinstall the app
2. The onboarding modal should appear on first launch
3. After completing onboarding, it should not appear again
4. You can test by clearing AsyncStorage key `hasSeenOnboarding`

## Notes

- The onboarding modal was removed because you mentioned having "tour, onboarding interactive etc" already
- This reset guide allows you to restore the functionality if needed
- Make sure the `OnboardingModalInteractive` component still exists and works properly
