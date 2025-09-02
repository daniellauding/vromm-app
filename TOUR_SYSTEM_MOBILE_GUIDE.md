# 🎯 Mobile Tour System - Complete Integration Guide

## 📚 **HOW THE TOUR SYSTEM WORKS:**

### **1. Database → Mobile App Flow:**
```
Database `content` table → TourContext.tsx → Mobile App UI Components
```

### **2. Database Structure:**
```sql
-- Example tour record:
{
  "content_type": "tour",
  "platforms": ["mobile"],           -- ✅ Mobile-specific
  "title": {"en": "...", "sv": "..."}, -- ✅ Multi-language
  "body": {"en": "...", "sv": "..."},  -- ✅ Multi-language  
  "target": "ProgressTab",             -- ✅ Points to UI element
  "category": "bottom",                -- ✅ Tooltip position
  "order_index": 2,                    -- ✅ Step sequence
  "icon": "📊",                        -- ✅ Visual indicator
  "active": true                       -- ✅ Content enabled
}
```

### **3. TourContext Integration:**
```javascript
// From TourContext.tsx:
const startDatabaseTour = async () => {
  // 1. Loads from 'content' table
  const { data } = await supabase
    .from('content')
    .select('*')
    .eq('content_type', 'tour')
    .eq('active', true)
    .order('order_index');

  // 2. Filters for mobile platform
  const mobileContent = data.filter(item => 
    item.platforms.includes('mobile')
  );

  // 3. Converts to tour steps
  const steps = mobileContent.map(item => ({
    id: item.id,
    title: item.title?.en || 'Tour Step',
    content: item.body?.en || 'Tour content',
    targetScreen: item.target || 'HomeTab',
    position: item.category || 'center',
  }));
  
  // 4. Activates tour
  setSteps(steps);
  setIsActive(true);
};
```

## 🎯 **MOBILE TARGET ELEMENTS:**

### **Your New Tour Steps Point To:**

1. **`GettingStarted.LicensePlan`** → First license plan card in HomeScreen
2. **`ProgressTab`** → Progress tab button in TabNavigator
3. **`CreateRouteTab`** → Central "+" create button
4. **`MapTab`** → Map tab button in TabNavigator  
5. **`MenuTab`** → Hamburger menu button

## 📱 **MOBILE IMPLEMENTATION:**

### **How Components Respond to Tour:**

#### **HomeScreen/GettingStarted.tsx:**
```javascript
// Components need tour-aware props:
const { isActive, currentStep, steps } = useTour();

// Tour highlights license plan card when target === 'GettingStarted.LicensePlan'
<TouchableOpacity 
  data-tour="license-plan"  // ← Tour system matches this
  style={[
    normalStyle,
    isActive && currentStep?.target === 'GettingStarted.LicensePlan' && tourHighlightStyle
  ]}
>
```

#### **TabNavigator.tsx:**
```javascript
// Tour highlights specific tabs:
<Tab.Screen 
  name="ProgressTab"
  options={{
    tabBarButton: (props) => (
      <CustomTabBarButton 
        {...props} 
        highlighted={currentStep?.target === 'ProgressTab'}
      />
    )
  }}
/>
```

## 🚀 **SETUP INSTRUCTIONS:**

### **1. Copy-Paste SQL:**
✅ Use `MOBILE_TOUR_STEPS.sql` - **ready for production!**

### **2. Admin Panel Integration:**
Your admin panel already works! Just:
- ✅ **Set `platforms = ["mobile"]`** for mobile tours
- ✅ **Use target values** like `"ProgressTab"`, `"CreateRouteTab"`, `"MenuTab"`
- ✅ **Set category** to `"bottom"`, `"center"`, `"top-right"` for positioning

### **3. Target Element Mapping:**
```javascript
// In mobile app, map targets to actual components:
const TARGET_MAPPING = {
  'GettingStarted.LicensePlan': 'license-plan-card',
  'ProgressTab': 'progress-tab-button', 
  'CreateRouteTab': 'create-route-button',
  'MapTab': 'map-tab-button',
  'MenuTab': 'menu-tab-button'
};
```

## 🎨 **TOUR POSITIONING:**

### **Category → Tooltip Position:**
- `"center"` → Center of screen overlay
- `"bottom"` → Above bottom navigation
- `"top-right"` → Upper right corner
- `"bottom-right"` → Lower right (menu area)

## ✅ **WHAT'S READY:**

### **✅ Database Structure:** Complete
### **✅ TourContext:** Loads from database
### **✅ Multi-language:** EN/SV support
### **✅ Mobile Targeting:** Platform filtering
### **✅ Admin Integration:** Compatible with your admin panel

## 🔗 **USER FLOW:**

1. **User completes onboarding** → `tour_completed = false` in profile
2. **App checks `shouldShowTour()`** → Loads from database
3. **TourContext activates** → Shows sequential tour steps
4. **Each step highlights** → Specific UI components
5. **User completes tour** → `tour_completed = true` saved

**The tour system is fully integrated with your onboarding preferences and will customize based on user's vehicle type, transmission, and license selections!** 🎉
