# Onboarding System Migration Summary

## What Was Changed

The onboarding slide system has been **migrated from static fallbacks to the content promotion system**.

### Before (Old System)
- **Primary**: Content promotion system (`content` table with `content_type = 'onboarding'`)
- **Fallback 1**: Legacy `onboarding_slides` table 
- **Fallback 2**: Static hardcoded slides in `getFallbackSlides()`

### After (New System)
- **Only**: Promotion content system (`content` table with `content_type = 'promotion'`)
- **No fallbacks**: If no content exists, no onboarding is shown
- **Unified**: Onboarding slides are now part of the promotional content system

## Files Modified

1. **`src/services/onboardingService.ts`**
   - Removed legacy `onboarding_slides` table fallback
   - Removed static `getFallbackSlides()` function
   - Removed unused `SupabaseOnboardingSlide` interface
   - Removed unused `checkContentVersion()` function
   - Cleaned up imports (removed FontAwesome)

2. **`MIGRATE_ONBOARDING_TO_CONTENT.sql`** (new file)
   - Migration script to convert existing `onboarding_slides` to `content` table
   - Includes example promotion content for mobile platform

## Migration Steps Required

### 1. Run the Migration SQL
Execute the `MIGRATE_ONBOARDING_TO_CONTENT.sql` script in your Supabase SQL editor to:
- Convert existing slides from `onboarding_slides` table to `content` table as **promotion** type
- Set up proper content structure with JSON title/body fields
- Add mobile platform targeting
- Generate unique keys like `promotion.1756671582261.1`

### 2. Verify Migration
Check that promotion content exists:
```sql
SELECT 
  id, key, content_type, platforms, title, body, icon, icon_color, order_index, active
FROM "public"."content" 
WHERE content_type = 'promotion' 
ORDER BY order_index;
```

### 3. Optional: Clean Up Old Table
After verifying the migration works, you can optionally remove the old table:
```sql
-- OPTIONAL: Remove old onboarding_slides table after migration is verified
-- DROP TABLE IF EXISTS "public"."onboarding_slides";
```

## Promotion Content System Structure

The onboarding slides now use the unified `content` table with **promotion** content type:

```sql
-- Example content structure
{
  "content_type": "promotion",
  "platforms": ["mobile"],
  "title": {"en": "Welcome to Vromm", "sv": "Välkommen till Vromm"},
  "body": {"en": "Your new companion...", "sv": "Din nya kompanjon..."},
  "icon": "road",
  "icon_color": "#3498db",
  "order_index": 1,
  "active": true
}
```

## Benefits of This Change

1. **Unified System**: All content (onboarding, promotions, tours) now use the same system
2. **Better Management**: Content can be managed through a single interface
3. **Platform Targeting**: Better support for mobile/web platform targeting
4. **Rich Media**: Support for images, videos, embeds, SVG icons
5. **No Static Dependencies**: Removes hardcoded fallback content from the app
6. **Cleaner Code**: Removed legacy code and simplified the service

## Testing

After migration, test:
1. **First-time users**: Should see onboarding slides from content system
2. **Returning users**: Should not see onboarding unless content changes
3. **No content**: Should gracefully show no onboarding instead of fallback
4. **Content updates**: Should trigger onboarding to show again for existing users

## Answer to Your Original Question

> **"what is this slide and modal at login? from supabase or static?"**

**Answer**: The slide/modal at login is the **onboarding system**. It was previously a **hybrid system** (Supabase + static fallback), but is now **exclusively from Supabase** using the **promotion content system**.

Your data:
```
4a79f6c1-09e6-4d4a-a8d1-6c39ad9a436e,Welcome to Vromm,Välkommen till Vromm,Your new companion for driver training,Din nya kompanjon för körkortsutbildning,,road,#3498db,1,true,2025-03-24 09:24:49.495928+00,2025-03-24 09:24:49.495928+00
```

This is from the **legacy `onboarding_slides` table**. After running the migration, this will be moved to the **`content` table** with `content_type = 'promotion'` and `platforms = ["mobile"]`.

> **"but i want it from promotion? onboarding is part of other slides"**

**Answer**: ✅ **PERFECT!** I've updated the system to use `content_type = 'promotion'` instead of a separate onboarding type. The onboarding slides are now **part of the promotional content system**, making it unified with your existing promotion content like the ones you showed (`'83c15ad5-f30e-42ff-b3e4-cb4f9c91e45a'`, `'50bb7b95-d8fe-46c1-8bff-5d1dc8e85279'`).
