# Image Picker Crash Fixes for Preview Builds

## Problem Analysis
The app was crashing in preview builds when users tried to upload images, while working fine in Expo Go. This is a common issue when transitioning from development to production builds.

## Root Causes Identified

### 1. Missing Plugin Configuration
- **Issue**: `expo-image-picker` plugin was not configured in `app.json`
- **Impact**: Preview builds couldn't access native camera/photo library APIs
- **Fix**: Added `expo-image-picker` plugin with proper permissions

### 2. Missing Permissions
- **Issue**: Camera and photo library permissions were not declared
- **Impact**: iOS and Android builds couldn't request camera/photo access
- **Fix**: Added proper permission declarations for both platforms

### 3. Memory Issues from High Quality Settings
- **Issue**: Different components used `quality: 1` (max quality) and `base64: true`
- **Impact**: Large images caused memory crashes in production builds
- **Fix**: Standardized to `quality: 0.8` and `base64: false`

### 4. Inconsistent Error Handling
- **Issue**: Different image picker implementations across components
- **Impact**: Some implementations were more crash-prone than others
- **Fix**: Standardized all implementations to match the working AddReviewScreen pattern

## Changes Made

### 1. app.json Configuration
```json
{
  "plugins": [
    // ... existing plugins
    [
      "expo-image-picker",
      {
        "photosPermission": "The app accesses your photos to let you share them with your routes and reviews.",
        "cameraPermission": "The app accesses your camera to let you take photos for your routes and reviews."
      }
    ]
  ],
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "This app needs access to your camera to take photos for routes and reviews.",
      "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to select images for routes and reviews."
    }
  },
  "android": {
    "permissions": [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

### 2. Standardized Image Picker Settings

**Before (crash-prone):**
```javascript
// High quality, memory-intensive
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  quality: 1, // Max quality - causes crashes
  base64: true, // Memory intensive
});
```

**After (stable):**
```javascript
// Stable, memory-efficient
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images
  quality: 0.8, // Good quality, memory efficient
  allowsEditing: true,
  base64: false, // Better performance
});
```

### 3. Stable Image Processing Method

All components now use the same stable method as AddReviewScreen:

```javascript
// Convert image to base64 using FileReader (stable method)
const response = await fetch(imageUri);
const blob = await response.blob();
const reader = new FileReader();
const base64 = await new Promise<string>((resolve, reject) => {
  reader.onloadend = () => {
    const base64data = reader.result as string;
    resolve(base64data.split(',')[1]); // Remove data URL prefix
  };
  reader.onerror = () => reject(new Error('Failed to process image'));
  reader.readAsDataURL(blob);
});
```

### 4. Updated Components

1. **ProfileScreen.tsx**: Avatar upload now uses stable method
2. **CreateRouteScreen.tsx**: Route media upload uses mediaUtils with stable settings
3. **MediaCarousel.tsx**: Simplified to images only with stable quality
4. **ReviewSection.tsx**: Review images use stable processing method
5. **mediaUtils.ts**: Centralized stable image picker utilities

## Testing Recommendations

### For Development Testing
- **Use Expo Development Build** instead of Expo Go for more accurate testing
- Expo Go doesn't show the same permission/plugin issues as production builds
- Development builds are closer to preview/production builds

### Testing Checklist

1. **Profile Screen Avatar Upload**
   - ✅ Pick from library
   - ✅ Take photo with camera
   - ✅ Upload to Supabase
   - ✅ Display in profile

2. **Route Creation Media**
   - ✅ Add media from library
   - ✅ Take photo for route
   - ✅ Upload and save with route
   - ✅ Display in route carousel

3. **Review Images**
   - ✅ Add images to review
   - ✅ Take photo for review
   - ✅ Upload with review submission
   - ✅ Display in review list

### Build Testing Strategy

1. **Development Build**: Test all image functionality
2. **Preview Build**: Verify no crashes occur
3. **Production Build**: Final verification before release

## Why These Fixes Work

1. **Plugin Configuration**: Ensures native APIs are available in builds
2. **Proper Permissions**: Prevents permission-related crashes
3. **Memory Efficiency**: Lower quality settings prevent out-of-memory crashes
4. **Consistent Implementation**: Reduces edge cases and unexpected behaviors
5. **Stable Processing**: FileReader method is more reliable across platforms

## Development vs Production Differences

- **Expo Go**: Uses Expo's managed environment, doesn't show plugin/permission issues
- **Development Build**: Includes your app.json configuration, shows real issues
- **Preview/Production**: Final compiled app, most strict environment

**Recommendation**: Use development builds for testing image functionality to catch issues early.

## Next Steps

1. Test with development build first
2. Create preview build to verify fixes
3. Test all image upload scenarios
4. Monitor crash reports in production
5. Consider adding crash reporting (Sentry, Bugsnag) for better debugging 