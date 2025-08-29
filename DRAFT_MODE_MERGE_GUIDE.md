# Draft Mode Selective Merge Guide

## Overview
This guide helps you merge ONLY the Draft Mode functionality from the `newCreateRouteSheet` branch into main, without replacing any existing functionality.

## Features to Merge
1. **Draft Mode** - Database migration and UI for saving/managing draft routes
2. **Save as Draft Button** - Modal confirmation in CreateRouteScreen
3. **Draft Routes Section** - Display on HomeScreen
4. **Emergency Draft Saving** - Auto-save and crash recovery

## Step 1: Database Migration

### Apply the migration file:
```bash
# Copy the migration file
git checkout newCreateRouteSheet -- supabase/migrations/20250115000000_add_is_draft_to_routes.sql

# Run the migration
supabase db push
```

## Step 2: Add DraftRoutes Component

### Create new file: `src/screens/HomeScreen/DraftRoutes.tsx`
```bash
# Copy the entire DraftRoutes component
git checkout newCreateRouteSheet -- src/screens/HomeScreen/DraftRoutes.tsx
```

## Step 3: Update HomeScreen

### In `src/screens/HomeScreen/index.tsx`:

#### Add import at the top (around line 28):
```tsx
import { DraftRoutes } from './DraftRoutes';
```

#### Add DraftRoutes section (after CreatedRoutes, around line 153):
```tsx
<DraftRoutes />
```

## Step 4: Add Draft Functionality to CreateRouteScreen

### In `src/screens/CreateRouteScreen.tsx`:

#### 1. Add Draft State Variables (around line 480):
```tsx
// ==================== DRAFT FUNCTIONALITY ====================

const saveAsDraft = async () => {
  // Use the same logic as handleCreateDraft but for exit confirmation
  await handleCreateDraft();
  
  // Reset unsaved changes flag and close confirmation
  setHasUnsavedChanges(false);
  setShowExitConfirmation(false);
};
```

#### 2. Add handleCreateDraft function (around line 1080):
```tsx
const handleCreateDraft = async () => {
  if (!user) {
    Alert.alert('Error', 'You must be logged in to save a draft');
    return;
  }

  setLoading(true);

  try {
    // Prepare draft data
    const draftData = {
      name: formData.name || 'Untitled Draft',
      description: formData.description,
      difficulty: formData.difficulty,
      spot_type: formData.spot_type,
      visibility: 'private' as const, // Drafts are always private
      is_draft: true, // Mark as draft
      best_season: formData.best_season,
      best_times: formData.best_times,
      vehicle_types: formData.vehicle_types,
      activity_level: formData.activity_level,
      spot_subtype: formData.spot_subtype,
      transmission_type: formData.transmission_type,
      category: formData.category,
      creator_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      waypoint_details: waypoints.map((wp, index) => ({
        index,
        latitude: wp.latitude,
        longitude: wp.longitude,
        title: wp.title,
        description: wp.description,
      })),
      metadata: {
        drawingMode: drawingMode,
        ...(drawingMode === 'pen' && penPath.length > 0 ? { coordinates: penPath } : {}),
      },
      suggested_exercises: exercises.length > 0 ? JSON.stringify(exercises) : '',
      media: media.map((item) => ({
        type: item.type,
        uri: item.uri,
        description: item.description,
      })),
      drawing_mode: drawingMode === 'pen' ? 'pen' : 'waypoint',
    };

    const { data: newRoute, error } = await supabase
      .from('routes')
      .insert(draftData)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Draft saved successfully:', newRoute.id);

    // Show success toast
    showRouteCreatedToast(newRoute.id, newRoute.name, false, true); // true for isDraft

    setLoading(false);

    // Navigate to home
    navigation.navigate('MainTabs', {
      screen: 'HomeTab',
      params: { screen: 'Home' },
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    Alert.alert('Error', 'Failed to save draft. Please try again.');
    setLoading(false);
  }
};
```

#### 3. Update showRouteCreatedToast to handle drafts (modify existing function):
```tsx
// In your toast function, add isDraft parameter
const showRouteCreatedToast = (routeId: string, routeName: string, published: boolean, isDraft = false) => {
  if (isDraft) {
    showToast('Draft Saved', `"${routeName}" saved as draft`, 'success');
  } else {
    showToast(
      published ? 'Route Published!' : 'Route Created!',
      `"${routeName}" has been ${published ? 'published' : 'created successfully'}`,
      'success'
    );
  }
};
```

#### 4. Add Save as Draft Button (around line 2737):
```tsx
{/* Save as Draft Button */}
{!routeId && (
  <Button
    onPress={handleCreateDraft}
    disabled={loading || waypoints.length === 0}
    variant="secondary"
    backgroundColor="$backgroundHover"
    borderColor="$borderColor"
    borderWidth={1}
    size="lg"
    flex={1}
  >
    <XStack gap="$2" alignItems="center">
      <Feather name="save" size={20} color={iconColor} />
      <Text color="$color">
        {loading
          ? getTranslation(t, 'createRoute.saving', 'Saving...')
          : getTranslation(t, 'createRoute.saveAsDraft', 'Save as Draft')}
      </Text>
    </XStack>
  </Button>
)}
```

#### 5. Add Exit Confirmation Modal with Draft Option (around line 2840):
```tsx
{/* Exit Confirmation Modal */}
{showExitConfirmation && (
  <Modal visible={showExitConfirmation} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <YStack gap="$4" padding="$4">
          <Text fontSize="$6" fontWeight="bold" color="$color">
            {t('createRoute.unsavedChanges') || 'Unsaved Changes'}
          </Text>
          
          <Text fontSize="$4" color="$gray11">
            {t('createRoute.unsavedChangesMessage') || 
             'You have unsaved changes. Would you like to save them as a draft?'}
          </Text>
          
          <YStack gap="$3">
            {/* Save as Draft Button */}
            <Button
              onPress={saveAsDraft}
              variant="secondary"
              size="lg"
              backgroundColor="$blue5"
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="save" size={20} color="$blue11" />
                <Text color="$blue11" fontSize="$4" fontWeight="500">
                  {t('createRoute.saveAsDraft') || 'Save as Draft'}
                </Text>
              </XStack>
            </Button>

            {/* Continue Editing Button */}
            <Button onPress={handleContinueEditing} variant="primary" size="lg">
              <XStack gap="$2" alignItems="center">
                <Feather name="edit-3" size={20} color="white" />
                <Text color="white" fontSize="$4" fontWeight="500">
                  {t('createRoute.continueEditing') || 'Continue Editing'}
                </Text>
              </XStack>
            </Button>

            {/* Discard Changes Button */}
            <Button
              onPress={handleExitWithoutSaving}
              variant="tertiary"
              size="lg"
            >
              <Text color="$red11" fontSize="$4" fontWeight="500">
                {t('createRoute.discardChanges') || 'Discard Changes'}
              </Text>
            </Button>
          </YStack>
        </YStack>
      </View>
    </View>
  </Modal>
)}
```

## Step 5: Add Emergency Draft Saving (Optional)

### In `src/components/RecordDrivingSheet.tsx`:

#### 1. Add auto-save constants (around line 147):
```tsx
// Auto-save constants
const AUTO_SAVE_KEY = '@recording_session_backup';
const AUTO_SAVE_INTERVAL = 10000; // Save every 10 seconds
const RECOVERY_CHECK_KEY = '@recording_recovery_check';
```

#### 2. Add auto-save functionality (around line 417):
```tsx
const autoSaveSession = useCallback(async () => {
  if (!isRecording) return;

  try {
    const now = Date.now();
    if (now - lastAutoSaveRef.current < AUTO_SAVE_INTERVAL) {
      return;
    }

    const sessionData = {
      waypoints: wayPointsRef.current,
      distance: distance,
      elapsedTime: totalElapsedTime,
      timestamp: now,
      routeName: routeName,
    };

    await AsyncStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(sessionData));
    lastAutoSaveRef.current = now;
    console.log('✅ Auto-saved recording session');
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
  }
}, [isRecording, distance, totalElapsedTime, routeName]);
```

#### 3. Add emergency draft save (around line 565):
```tsx
const saveAsDraftEmergency = useCallback(async () => {
  try {
    if (!isRecording || wayPointsRef.current.length === 0) {
      return;
    }

    console.log('🚨 Emergency draft save triggered');
    
    // Create emergency draft data
    const validWaypoints = wayPointsRef.current.filter((wp) => 
      wp && 
      typeof wp.latitude === 'number' && 
      typeof wp.longitude === 'number' &&
      !isNaN(wp.latitude) && 
      !isNaN(wp.longitude)
    );

    if (validWaypoints.length === 0) {
      console.log('🚨 No valid waypoints for emergency save');
      return;
    }

    const waypointsForRoute = validWaypoints.map((wp, index) => ({
      latitude: wp.latitude,
      longitude: wp.longitude,
      title: `Waypoint ${index + 1}`,
      description: `Recorded at ${new Date(wp.timestamp).toLocaleTimeString()}`,
      timestamp: wp.timestamp,
    }));

    const emergencyDraftData = {
      waypoints: waypointsForRoute,
      distance: distance,
      duration: totalElapsedTime,
      timeDisplay: formatTime(totalElapsedTime),
      drawingMode: 'record' as const,
      routePath: validWaypoints,
      name: routeName || `Recording ${new Date().toLocaleString()}`,
      description: `Emergency save - ${distance.toFixed(2)}km in ${formatTime(totalElapsedTime)}`,
      startPoint: validWaypoints.length > 0 ? {
        latitude: validWaypoints[0].latitude,
        longitude: validWaypoints[0].longitude,
      } : undefined,
      endPoint: validWaypoints.length > 1 ? {
        latitude: validWaypoints[validWaypoints.length - 1].latitude,
        longitude: validWaypoints[validWaypoints.length - 1].longitude,
      } : undefined,
    };

    // Store emergency draft data
    await AsyncStorage.setItem('@emergency_draft', JSON.stringify(emergencyDraftData));
    
    console.log('🚨 Emergency draft saved successfully');

  } catch (error) {
    console.error('🚨 Emergency draft save failed:', error);
  }
}, [isRecording, distance, totalElapsedTime, formatTime]);
```

#### 4. Setup app state listener for emergency saves:
```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState === 'background') {
      // App is going to background
      if (isRecording) {
        saveAsDraftEmergency();
      }
    }
    appState.current = nextAppState;
  });

  return () => {
    subscription.remove();
  };
}, [isRecording, saveAsDraftEmergency]);
```

## Step 6: Update Navigation Types (if needed)

### In `src/types/navigation.ts`:

Add to RouteListParams type:
```tsx
type: 'created' | 'saved' | 'recent' | 'drafts';
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Draft routes save with `is_draft: true` flag
- [ ] Draft routes appear in HomeScreen DraftRoutes section
- [ ] "Save as Draft" button works in CreateRouteScreen
- [ ] Exit confirmation modal shows draft option
- [ ] Draft routes are always private visibility
- [ ] Emergency draft saving works on app background
- [ ] Auto-save during recording works
- [ ] Draft routes can be viewed in RouteDetailScreen
- [ ] "See All Drafts" navigation works

## Notes

1. **DO NOT** replace the entire CreateRouteScreen - only add the draft-specific functions
2. **DO NOT** modify existing route creation logic - drafts are a separate flow
3. Drafts are always private (`visibility: 'private'`) and marked with `is_draft: true`
4. The emergency draft saving is optional but recommended for better UX
5. Test thoroughly before merging to main branch

## Rollback

If issues occur, you can rollback:

1. Remove `is_draft` column:
```sql
ALTER TABLE routes DROP COLUMN IF EXISTS is_draft;
```

2. Remove DraftRoutes component and imports
3. Remove draft-specific functions from CreateRouteScreen
4. Remove emergency save functionality from RecordDrivingSheet