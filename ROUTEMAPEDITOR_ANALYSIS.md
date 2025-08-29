# RouteMapEditor Usage Analysis

## Overview
The `RouteMapEditor` component is used in both `RouteWizardSheet` and `CreateRouteScreen`, but they are **NOT the same implementation** - they have significant differences in functionality and state management.

## Key Differences

### 1. **Undo/Redo Functionality**
- **RouteMapEditor Component**: Has built-in undo/redo functionality (lines 68, 423-440)
- **CreateRouteScreen**: Has its own separate undo/redo system (lines 215, 733-745)
- **RouteWizardSheet**: Does NOT use undo/redo at all

**Issue**: CreateRouteScreen maintains its own `undoneWaypoints` state and undo/redo handlers OUTSIDE of RouteMapEditor, creating duplicate functionality that may conflict with the component's internal undo/redo.

### 2. **State Management**

#### RouteWizardSheet (Working Well)
```jsx
<RouteMapEditor
  waypoints={routeData.waypoints.map(wp => ({...}))}
  onWaypointsChange={(newWaypoints) => {
    updateRouteData({ waypoints: newWaypoints.map(...) });
  }}
  drawingMode={routeData.drawingMode}
  onDrawingModeChange={(mode) => updateRouteData({ drawingMode: mode })}
  penPath={routeData.penPath}
  onPenPathChange={(path) => updateRouteData({ penPath: path })}
  routePath={routeData.routePath}
  onRecord={handleStartRecording}
  // ...
/>
```
- Clean, centralized state in `routeData` object
- All state changes go through `updateRouteData`
- No external undo/redo interference

#### CreateRouteScreen (Problematic)
```jsx
<RouteMapEditor
  waypoints={waypoints.map(wp => ({...}))}
  onWaypointsChange={(newWaypoints) => {
    const convertedWaypoints = newWaypoints.map(...);
    setWaypoints(convertedWaypoints);
  }}
  drawingMode={drawingMode}
  onDrawingModeChange={setDrawingMode}
  penPath={penPath}
  onPenPathChange={setPenPath}
  routePath={routePath || undefined}
  onRecord={handleRecordRoute}
  // ...
/>
```
- Fragmented state across multiple useState hooks
- External undo/redo system that duplicates internal functionality
- Direct state setters passed down

### 3. **Drawing Mode Behavior**

Both use the same drawing modes (`pin`, `waypoint`, `pen`, `record`), but:

- **RouteWizardSheet**: Drawing mode is part of centralized `routeData` state
- **CreateRouteScreen**: Drawing mode managed separately, with complex validation logic scattered throughout (lines 1194-1227)

### 4. **Waypoint Mode Issues**

The waypoint mode might not work the same because:

1. **State Synchronization**: CreateRouteScreen has its own waypoint state management that might conflict with RouteMapEditor's internal state
2. **Undo/Redo Conflict**: Two separate undo/redo systems may cause waypoints to be out of sync
3. **Event Handling**: CreateRouteScreen has additional map event handlers (handleMapPress at line 504) that might interfere

## Why RouteWizardSheet Works Better

1. **Single Source of Truth**: All state in one `routeData` object
2. **No Duplicate Logic**: Uses RouteMapEditor's built-in undo/redo
3. **Clean Data Flow**: Simple update pattern through `updateRouteData`
4. **No External Interference**: No additional event handlers or state management

## Recommendations

### Option 1: Align CreateRouteScreen with RouteWizardSheet Pattern (Recommended)
1. Remove external undo/redo system from CreateRouteScreen
2. Consolidate state into a single object like RouteWizardSheet
3. Remove duplicate map event handlers
4. Use RouteMapEditor's built-in functionality

### Option 2: Extract Working Implementation
Since RouteWizardSheet is working well, you could:
1. Extract its RouteMapEditor usage pattern into a shared hook
2. Reuse this pattern in CreateRouteScreen
3. Ensure both screens use the same approach

### Option 3: Fix CreateRouteScreen Issues
If you need to keep the current structure:
1. Remove the external undo/redo system (lines 733-745)
2. Remove the separate `undoneWaypoints` state (line 215)
3. Let RouteMapEditor handle all waypoint management internally
4. Remove conflicting event handlers

## Code to Fix in CreateRouteScreen

### Remove these lines:
```tsx
// Line 215
const [undoneWaypoints, setUndoneWaypoints] = useState<Waypoint[]>([]);

// Lines 733-745 (entire undo/redo handlers)
const handleUndo = () => { ... }
const handleRedo = () => { ... }
```

### Simplify state management:
Instead of multiple useState calls, consider:
```tsx
const [routeData, setRouteData] = useState({
  waypoints: initialWaypoints || [],
  drawingMode: initialWaypoints?.length ? 'record' : 'pin',
  penPath: [],
  routePath: initialRoutePath || null,
  // ... other state
});
```

This would align CreateRouteScreen with the working pattern in RouteWizardSheet and eliminate the conflicts causing waypoint mode issues.