# Complete Diff Summary: main vs newCreateRouteSheet Branch

## Overall Statistics
- **27 files changed**
- **7,480 insertions (+)**
- **448 deletions (-)**

## Files Organized by Feature

### 1. Draft Mode Feature Files
| File | Changes | Purpose |
|------|---------|---------|
| `supabase/migrations/20250115000000_add_is_draft_to_routes.sql` | +21 lines | Database migration for `is_draft` column |
| `src/screens/HomeScreen/DraftRoutes.tsx` | +145 lines (NEW) | Draft routes display component |
| `src/screens/HomeScreen/index.tsx` | +13 lines | Integration of DraftRoutes section |
| `src/screens/CreateRouteScreen.tsx` | +463/-448 lines | Added draft save functionality |
| `src/components/RecordDrivingSheet.tsx` | +401 lines | Emergency draft saving & auto-save |

### 2. RouteWizardSheet & Related (EXCLUDE FROM MERGE)
| File | Changes | Purpose |
|------|---------|---------|
| `src/components/RouteWizardSheet.tsx` | +2028 lines (NEW) | Main wizard component |
| `src/components/wizard/BasicInfoStep.tsx` | +339 lines (NEW) | Wizard step |
| `src/components/wizard/ExercisesStep.tsx` | +318 lines (NEW) | Wizard step |
| `src/components/wizard/MapInteractionStep.tsx` | +450 lines (NEW) | Wizard step |
| `src/components/wizard/MediaStep.tsx` | +272 lines (NEW) | Wizard step |
| `src/components/wizard/ReviewStep.tsx` | +291 lines (NEW) | Wizard step |
| `src/components/shared/RouteMapEditor.tsx` | +815 lines (NEW) | Map editor component |
| `src/components/shared/RouteExerciseSelector.tsx` | +410 lines (NEW) | Exercise selector |
| `src/components/shared/RouteExercisesSection.tsx` | +131 lines (NEW) | Exercise display |

### 3. Interactive Onboarding
| File | Changes | Purpose |
|------|---------|---------|
| `src/components/OnboardingInteractive.tsx` | +678 lines (NEW) | Interactive onboarding flow |
| `src/components/OnboardingModalInteractive.tsx` | +140 lines (NEW) | Modal wrapper |
| `src/components/OnboardingBackup.tsx` | +514 lines (NEW) | Backup onboarding |

### 4. Navigation & UI Fixes
| File | Changes | Purpose |
|------|---------|---------|
| `src/components/TabNavigator.tsx` | +77 lines | Tab visibility fixes |
| `src/components/ActionSheet.tsx` | +71 lines | Gesture improvements |
| `src/screens/ConversationScreen.tsx` | +4 lines | Padding adjustments |
| `src/screens/CreateEventScreen.tsx` | +35 lines | Layout improvements |
| `src/screens/RouteDetailScreen.tsx` | +135 lines | Draft support & UI updates |
| `src/screens/RouteListScreen.tsx` | +25 lines | Draft filtering support |

### 5. Other Components
| File | Changes | Purpose |
|------|---------|---------|
| `src/components/Map/index.native.tsx` | +87 lines | Map improvements |
| `src/contexts/ToastContext.tsx` | +22 lines | Toast notifications for drafts |
| `src/screens/HomeScreen/CreatedRoutes.tsx` | +40 lines | Updated route display |
| `src/screens/explore/RoutesDrawer.tsx` | +3 lines | Minor adjustments |

## Key Changes in TabNavigator.tsx

### Added:
```diff
+ const [isTabBarVisible, setIsTabBarVisible] = useState(true);
+ const handleMaximizeWizard = useCallback((wizardData: any) => {...}); // EXCLUDE
+ 
+ useEffect(() => {
+   // Tab visibility control logic
+   const hideTabBarScreens = [
+     'CreateRoute',
+     'RouteDetail',
+     'ConversationScreen',
+     'Conversation',
+     'PublicProfile',
+     'ProfileScreen',
+     'EventDetail'
+   ];
+   setIsTabBarVisible(!shouldHideTabBar);
+ }, [navigation]);
+ 
+ tabBarStyle: isTabBarVisible ? tabBarStyle : { display: 'none' },
```

## Key Changes in CreateRouteScreen.tsx

### Added for Draft Mode:
```diff
+ const saveAsDraft = async () => {...};
+ const handleCreateDraft = async () => {...};
+ is_draft: true, // In route creation
+ 
+ // Save as Draft Button
+ <Button onPress={handleCreateDraft}>Save as Draft</Button>
+ 
+ // Exit Confirmation Modal with Draft Option
+ <Modal>
+   <Button onPress={saveAsDraft}>Save as Draft</Button>
+   <Button onPress={handleContinueEditing}>Continue Editing</Button>
+   <Button onPress={handleExitWithoutSaving}>Discard Changes</Button>
+ </Modal>
```

## Selective Merge Strategy

### ✅ INCLUDE in Merge:
1. **Draft Mode**
   - Database migration
   - DraftRoutes component
   - CreateRouteScreen draft functions
   - Emergency draft saving in RecordDrivingSheet
   
2. **Onboarding**
   - All three onboarding components
   
3. **Navigation Fixes**
   - Tab visibility state and logic
   - Screen padding adjustments

### ❌ EXCLUDE from Merge:
1. **RouteWizardSheet** and all wizard components
2. **RouteMapEditor** and related shared components
3. **handleMaximizeWizard** function in TabNavigator
4. **RouteExercise** components

## Git Commands for Features

### For Draft Mode Only:
```bash
git checkout newCreateRouteSheet -- supabase/migrations/20250115000000_add_is_draft_to_routes.sql
git checkout newCreateRouteSheet -- src/screens/HomeScreen/DraftRoutes.tsx
# Manually add draft functions to CreateRouteScreen
# Manually add emergency save to RecordDrivingSheet
```

### For Onboarding Only:
```bash
git checkout newCreateRouteSheet -- src/components/OnboardingInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingModalInteractive.tsx
git checkout newCreateRouteSheet -- src/components/OnboardingBackup.tsx
```

### For Navigation Fixes:
```bash
# Manually apply TabNavigator visibility changes
# Exclude handleMaximizeWizard function
```

## Testing Matrix

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| Draft Save | Click "Save as Draft" | Route saved with `is_draft: true` |
| Draft Display | Check HomeScreen | DraftRoutes section visible with drafts |
| Emergency Save | App background during recording | Auto-saves to AsyncStorage |
| Tab Visibility | Navigate to CreateRoute | Tab bar hides |
| Tab Visibility | Navigate to Home | Tab bar shows |
| Onboarding | New user flow | Interactive onboarding displays |

## Migration Risks

### Low Risk:
- Draft mode (isolated feature)
- Onboarding (new components)
- Tab visibility (UI only)

### Medium Risk:
- CreateRouteScreen modifications (test thoroughly)
- RecordDrivingSheet auto-save (test crash scenarios)

### High Risk:
- Mixing RouteWizardSheet with existing code (DO NOT DO)
- Replacing RouteMapEditor usage (DO NOT DO)