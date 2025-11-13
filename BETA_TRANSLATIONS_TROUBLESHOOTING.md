# Beta Translations Troubleshooting Guide

## Issue
Swedish translations for Beta Testing Sheet checklist items are not appearing, even after inserting them into the database and restarting the app.

## What I've Added

### 1. Debug Logging in `TranslationContext.tsx`
- Added detailed logging when fetching translations from Supabase
- Logs the count of `beta.checklist.*` translations loaded
- Warns if NO beta translations are found

### 2. Debug Logging in `BetaTestingSheet.tsx`
- Logs available beta.checklist translations count on mount
- Shows sample translation keys
- Logs total translations loaded

### 3. Manual Refresh Button (DEV MODE ONLY)
- Added a refresh icon button in the Beta Testing Sheet header
- Only visible in development mode (`__DEV__`)
- Clicking it will:
  - Clear the translation cache
  - Force fetch fresh translations from Supabase
  - Show a toast with the count of loaded translations

## Troubleshooting Steps

### Step 1: Verify Translations in Database
Run this SQL query in Supabase SQL Editor:

```sql
-- Check if beta translations exist
SELECT
  language,
  platform,
  COUNT(*) as total_translations
FROM public.translations
WHERE key LIKE 'beta.checklist.%'
GROUP BY language, platform
ORDER BY language, platform;
```

**Expected result:**
- `en`, `mobile`: ~78 translations
- `sv`, `mobile`: ~78 translations

If you see 0 results, the translations were not inserted. Re-run:
```bash
sql/beta_testing_checklist_translations.sql
```

### Step 2: Check Translation Loading Logs
1. **Completely kill the app** (not just refresh)
   - On iOS: Swipe up from bottom and swipe app away
   - On Android: Recent apps → Swipe away
2. Restart the app
3. Look for these logs in the console:

```
🌐 [TranslationContext] Fetching translations from Supabase... { language: 'sv', platform: 'mobile', devMode: true, forceFresh: true }
🌐 [TranslationContext] ✅ Loaded XXX translations
🌐 [TranslationContext] Beta checklist translations: XX
🌐 [TranslationContext] Sample beta keys: [...]
```

**If you see:**
- `Beta checklist translations: 0` or `NO beta.checklist translations found!` → The query is not finding the translations
- `Beta checklist translations: 78` → Translations are loaded correctly

### Step 3: Check BetaTestingSheet Logs
1. Open the Beta Testing Sheet in the app
2. Look for these logs:

```
🌍 [BetaTestingSheet] Available beta.checklist translations: XX
🌍 [BetaTestingSheet] Sample keys: [...]
🌍 [BetaTestingSheet] Total translations loaded: XXX
```

**If you see:**
- `Available beta.checklist translations: 0` → Translations are not in the context
- `Available beta.checklist translations: 78` → Translations are loaded, but the key lookup might be failing

### Step 4: Use Manual Refresh Button
1. Open the Beta Testing Sheet
2. Look for a refresh icon button next to the close (X) button in the top-right
3. Tap it to manually refresh translations
4. Check if the Swedish text appears

### Step 5: Verify Translation Key Format
The translation keys should match this format:
```
beta.checklist.{role}.{id}.{field}
```

Example:
- `beta.checklist.student.connect_supervisor.title`
- `beta.checklist.student.connect_supervisor.description`

Run this SQL to verify the format:

```sql
SELECT key, value
FROM public.translations
WHERE key LIKE 'beta.checklist.student.connect_supervisor%'
  AND language = 'sv'
ORDER BY key;
```

**Expected result:**
- `beta.checklist.student.connect_supervisor.title`: `Anslut till en handledare`
- `beta.checklist.student.connect_supervisor.description`: `Hitta och anslut till en handledare via appen`

### Step 6: Check Supabase Query
The `TranslationContext` fetches translations with:

```typescript
supabase
  .from('translations')
  .select('key, value, platform, updated_at')
  .eq('language', 'sv')
  .or('platform.is.null,platform.eq.mobile')
```

This should return translations where:
- `language = 'sv'`
- AND (`platform` is NULL OR `platform = 'mobile'`)

Verify with this SQL:

```sql
SELECT key, value, platform
FROM public.translations
WHERE language = 'sv'
  AND (platform IS NULL OR platform = 'mobile')
  AND key LIKE 'beta.checklist.student.connect_supervisor%'
ORDER BY key;
```

If this returns 0 rows but you know the translations exist, check:
- Is `platform` set to `'mobile'` (not `'app'` or something else)?
- Is `language` set to `'sv'` (not `'se'` or something else)?

## Common Issues

### Issue 1: Translations Inserted with Wrong Platform
**Symptom:** SQL shows translations exist, but app doesn't load them

**Solution:**
```sql
UPDATE public.translations
SET platform = 'mobile'
WHERE key LIKE 'beta.checklist.%'
  AND (platform IS NULL OR platform != 'mobile');
```

### Issue 2: Cache Not Clearing
**Symptom:** Old translations persist even after database updates

**Solution:**
1. Use the manual refresh button in the Beta Testing Sheet (DEV mode only)
2. Or, completely uninstall and reinstall the app

### Issue 3: Real-time Subscription Not Triggering
**Symptom:** Translations don't update until app restart

**Note:** This is expected if translations were inserted before the app was running. The real-time subscription only picks up changes made AFTER the subscription is established.

**Solution:**
- Use the manual refresh button
- Or restart the app

### Issue 4: Translation Key Mismatch
**Symptom:** Some translations work, others don't

**Check:** The `assignmentId` format in `beta_test_assignments` must match the translation key format.

Example:
- `assignmentId`: `student_connect_supervisor_1762978725773`
- Translation key: `beta.checklist.student.connect_supervisor.title`

The parsing logic:
```typescript
const role = 'student'
const id = 'connect_supervisor' // Everything between first and last underscore
const key = `beta.checklist.${role}.${id}.title`
```

## Force Clear Everything (Last Resort)

If nothing works, try this:

1. **Clear Supabase Cache:**
   ```sql
   -- This will trigger real-time subscriptions
   UPDATE public.translations
   SET updated_at = NOW()
   WHERE key LIKE 'beta.checklist.%';
   ```

2. **Clear App Cache:**
   - Uninstall the app completely
   - Reinstall and run

3. **Restart Supabase Project:**
   - Go to Supabase Dashboard
   - Project Settings → General → Restart project

## Success Indicators

You'll know it's working when:
1. Console logs show: `Beta checklist translations: 78` (or similar)
2. Swedish text appears in the Beta Testing Sheet checklist
3. Translation keys are logged as found: `Translation result: Anslut till en handledare`

## Need More Help?

If you're still stuck:
1. Share the console logs from Step 2 and Step 3
2. Share the SQL query results from Step 1 and Step 5
3. Check if there are any Supabase errors in the logs

