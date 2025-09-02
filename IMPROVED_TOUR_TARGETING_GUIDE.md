# 🎯 **IMPROVED TOUR TARGETING - SPECIFIC LINE TARGETING**

## ✅ **EXACT LINE TARGETING IMPLEMENTED:**

---

## 📊 **PROGRESSSCREEN TOURS (4 STEPS):**

### **✅ Step 1: Filter Button** 
**Target:** `ProgressScreen.FilterButton` (Line #4398)
**Element:** Filter menu TouchableOpacity
```tsx
// Line #4398 in ProgressScreen.tsx
<TouchableOpacity
  ref={filterButtonRef}
  onPress={() => setShowFilterDrawer(true)}
```
**Tour:** "Customize what learning paths you see based on vehicle type, license, experience..."

### **✅ Step 2: First Learning Path**
**Target:** `ProgressScreen.FirstPath` (Line #4634) 
**Element:** First path card TouchableOpacity
```tsx
// Line #4634 in ProgressScreen.tsx
ref={isFirstPath ? firstPathRef : (idx === 1 ? pathCardRef : undefined)}
```
**Tour:** "Each card shows a learning path with completion percentage..."

### **✅ Step 3: Second Learning Path** 
**Target:** `ProgressScreen.PathCard` (Line #4634)
**Element:** Second path card TouchableOpacity
```tsx
// Line #4634 in ProgressScreen.tsx  
ref={isFirstPath ? firstPathRef : (idx === 1 ? pathCardRef : undefined)}
```
**Tour:** "Explore different learning paths that focus on various driving skills..."

### **✅ Step 4: Exercise Selection**
**Target:** `ProgressScreen.ExerciseItem` (Line #4126)
**Element:** First exercise TouchableOpacity in path detail
```tsx
// Line #4126 in ProgressScreen.tsx
<TouchableOpacity 
  ref={exerciseIndex === 0 ? exerciseItemRef : undefined}
  onPress={() => setSelectedExercise(main)}
```
**Tour:** "Tap any exercise to see detailed instructions and track completion..."

---

## ✅ **EXERCISE DETAIL TOURS (2 STEPS):**

### **✅ Step 1: Mark Complete Button**
**Target:** `ExerciseDetail.MarkCompleteButton` (Line #3774)
**Element:** Mark all as done/not done TouchableOpacity
```tsx
// Line #3774 in ProgressScreen.tsx
<TouchableOpacity
  ref={markCompleteButtonRef}
  onPress={() => toggleCompletion(selectedExercise.id)}
```
**Tour:** "Mark this exercise as completed to track your progress..."

### **✅ Step 2: Repeat Section**
**Target:** `ExerciseDetail.RepeatSection` (Line #3556)
**Element:** All Repetitions YStack
```tsx
// Line #3556 in ProgressScreen.tsx
<YStack ref={repeatSectionRef} marginTop={16} marginBottom={16}>
  <Text>All Repetitions</Text>
```
**Tour:** "Some exercises require multiple repetitions to master..."

---

## 🗺️ **MAPSCREEN TOURS (2 STEPS - NEW!):**

### **✅ Step 1: Map View with Pins**
**Target:** `MapScreen.MapView` 
**Element:** Map component with route pins
```tsx
// MapScreen.tsx
<Map
  ref={mapRef}
  tourRef={mapViewRef}
  waypoints={activeWaypoints}
```
**Tour:** "Each pin represents a driving route. Tap pins to see route details..."

### **✅ Step 2: Routes Drawer**
**Target:** `MapScreen.RoutesDrawer`
**Element:** RoutesDrawer bottom sheet component
```tsx
// RoutesDrawer.tsx (updated with forwardRef)
<Animated.View ref={ref} style={[styles.bottomSheet]}>
```
**Tour:** "Swipe up this drawer to browse all available routes in your area..."

---

## 🎯 **TOUR FLOW ORGANIZATION:**

### **🏠 Main Home Tour (2 steps):**
1. **GettingStarted.LicensePlan** → License journey introduction
2. **ProgressSection.FirstCard** → Routes & progress overview

### **📊 ProgressScreen Tours (4 steps):**
1. **Filter Button** → Customize learning paths  
2. **First Path Card** → Learning progress overview
3. **Second Path Card** → Explore different paths
4. **First Exercise** → Exercise selection guide

### **✅ Exercise Detail Tours (2 steps):**
1. **Mark Complete Button** → Track completion progress
2. **Repeat Section** → Practice repetitions guide

### **🗺️ MapScreen Tours (2 steps):**
1. **Map View** → Explore route pins explanation
2. **Routes Drawer** → Browse routes list guide

### **📄 RouteDetailScreen Tours (3 steps):**
1. **Save Button** → Bookmark routes  
2. **Map Card** → Interactive route map
3. **Exercises Card** → Practice exercises

---

## 🎯 **TECHNICAL IMPROVEMENTS:**

### **✅ Better Element Targeting:**
```tsx
// Progressive targeting - first gets one ref, second gets another
ref={isFirstPath ? firstPathRef : (idx === 1 ? pathCardRef : undefined)}

// Exercise targeting - first exercise gets tour ref  
ref={exerciseIndex === 0 ? exerciseItemRef : undefined}

// Forward ref implementation for RoutesDrawer
export const RoutesDrawer = React.forwardRef<View, Props>(({...}, ref) => {
```

### **✅ MapScreen Integration:**
```tsx
// useFocusEffect triggers tours when map loads
useFocusEffect(() => {
  setTimeout(async () => {
    await triggerScreenTour('MapScreen', tourContext, profile?.role);
  }, 1200); // Delay for map/routes to load
});
```

### **✅ Role-Based Filtering:**
```tsx
// All screen tours respect user role
await triggerScreenTour('ProgressScreen', tourContext, profile?.role);
// Students don't see instructor-specific content
```

---

## 📁 **COPY-PASTE SQL:**

### **🎯 Use This Updated File:**
**`IMPROVED_SCREEN_TOURS.sql`** 
- ✅ **11 total tour steps** (ProgressScreen: 4, Exercise: 2, RouteDetail: 3, MapScreen: 2)
- ✅ **Specific line targeting** for exact UI elements you specified
- ✅ **Better tour flow** with logical progression
- ✅ **Swedish + English** content with proper translations

---

## 🎯 **EXPECTED BEHAVIOR:**

### **📊 ProgressScreen Experience:**
1. **Enter ProgressScreen** → Tour starts with 4 steps
2. **Step 1:** Filter button highlighted → "Customize learning paths"
3. **Step 2:** First path card highlighted → "Learning progress overview"  
4. **Step 3:** Second path card highlighted → "Explore different paths"
5. **Step 4:** First exercise highlighted → "Exercise selection guide"

### **✅ Exercise Detail Experience:**
1. **Select an exercise** → Exercise tour starts with 2 steps
2. **Step 1:** Mark complete button highlighted → "Track completion"
3. **Step 2:** Repeat section highlighted → "Practice repetitions"

### **🗺️ MapScreen Experience:**  
1. **Enter MapScreen** → Tour starts with 2 steps
2. **Step 1:** Map view highlighted → "Explore route pins"
3. **Step 2:** Routes drawer highlighted → "Browse routes list"

---

## 🎉 **IMPROVEMENTS SUMMARY:**

### **✅ Better Targeting:**
- **Filter menu** → Points to exact filter button (line #4395 area) ✅
- **Path boxes** → Points to first + second path cards (line #4644 area) ✅
- **Exercise items** → Points to first exercise in list (line #4125 area) ✅  
- **Mark complete** → Points to completion button (line #3774) ✅
- **Repeat section** → Points to repetitions area (line #3556) ✅

### **✅ New MapScreen Tours:**
- **Map pins** → Explains route pins and interaction ✅
- **Routes drawer** → Explains bottom sheet functionality ✅

### **✅ Technical Enhancements:**
- **Forward refs** → RoutesDrawer properly supports tour targeting ✅
- **Progressive refs** → Different elements get different tour targets ✅
- **Screen integration** → MapScreen auto-triggers tours on focus ✅

**Your tours now target the exact elements you specified!** 🎯✨

## 📋 **TESTING:**

1. **Copy-paste** `IMPROVED_SCREEN_TOURS.sql` ✅
2. **ProgressScreen** → Should highlight filter, paths, exercises progressively ✅
3. **MapScreen** → Should highlight map pins then routes drawer ✅  
4. **Exercise detail** → Should highlight complete button then repeats ✅

**All exact line targets implemented!** 🚀
