# 🗄️ SUPABASE TABLES - TESTING CHECKLIST

## 📋 Tables to Monitor During Testing

### 1. **`translations`** - Translation Cache
**Check if all filter translations exist:**
```sql
-- View all filter-related translations
SELECT key, language, value 
FROM translations 
WHERE key LIKE 'filters.%' 
ORDER BY key, language;

-- Count missing translations
SELECT 
  language,
  COUNT(*) as total_translations
FROM translations 
WHERE key LIKE 'filters.%'
GROUP BY language;

-- Expected: ~60-70 translations per language (EN/SV)
```

**Fix if missing:**
- Run `/FILTER_TRANSLATIONS.sql` in Supabase SQL Editor

---

### 2. **`routes`** - Route Creation
**Check newly created routes:**
```sql
-- View routes created today
SELECT 
  id,
  name,
  creator_id,
  created_at,
  drawing_mode,
  visibility,
  waypoint_details,
  media_attachments
FROM routes
WHERE created_at > CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;

-- Count routes by drawing mode
SELECT 
  drawing_mode,
  COUNT(*) as count
FROM routes
WHERE created_at > CURRENT_DATE
GROUP BY drawing_mode;
```

**What to test:**
- Create route with Pin mode
- Create route with Waypoint mode (2+ waypoints)
- Create route with Pen mode (draw on map)
- Upload media (1-3 images/videos)
- Verify `media_attachments` JSON array is populated

---

### 3. **`saved_routes`** - Save Route Functionality
**Check if save route works:**
```sql
-- View saved routes from today
SELECT 
  sr.route_id,
  sr.user_id,
  sr.saved_at,
  r.name as route_name
FROM saved_routes sr
LEFT JOIN routes r ON r.id = sr.route_id
WHERE sr.saved_at > CURRENT_DATE
ORDER BY sr.saved_at DESC;

-- Count saves per user
SELECT 
  user_id,
  COUNT(*) as saves_today
FROM saved_routes
WHERE saved_at > CURRENT_DATE
GROUP BY user_id;
```

**What to test:**
- Open RouteDetailSheet
- Click "Save" button
- Should hear sound + feel vibration
- Check row appears in `saved_routes` table

---

### 4. **`driven_routes`** - Mark as Driven
**Check if marking routes as driven works:**
```sql
-- View driven routes from today
SELECT 
  dr.route_id,
  dr.user_id,
  dr.driven_at,
  r.name as route_name
FROM driven_routes dr
LEFT JOIN routes r ON r.id = dr.route_id
WHERE dr.driven_at > CURRENT_DATE
ORDER BY dr.driven_at DESC;
```

**What to test:**
- Open RouteDetailSheet
- Click "Mark as Driven"
- Should hear sound + vibration + navigate to AddReviewScreen
- Check row appears in `driven_routes` table

---

### 5. **`learning_path_exercise_completions`** - Exercise Progress
**Check exercise completions:**
```sql
-- View completions from today
SELECT 
  lpec.exercise_id,
  lpec.user_id,
  lpec.completed_at,
  lpe.title as exercise_title
FROM learning_path_exercise_completions lpec
LEFT JOIN learning_path_exercises lpe ON lpe.id = lpec.exercise_id
WHERE lpec.completed_at > CURRENT_DATE
ORDER BY lpec.completed_at DESC
LIMIT 20;

-- Check completion rate
SELECT 
  COUNT(DISTINCT exercise_id) as unique_exercises_completed,
  COUNT(*) as total_completions
FROM learning_path_exercise_completions
WHERE completed_at > CURRENT_DATE;
```

**What to test:**
- Go to ProgressScreen
- Toggle exercise checkbox
- Should hear sound + vibration
- Check row appears/disappears in table

---

### 6. **`virtual_repeat_completions`** - Repeat Exercises
**Check virtual repeat completions:**
```sql
-- View virtual repeats completed today
SELECT 
  vrc.exercise_id,
  vrc.user_id,
  vrc.repeat_number,
  vrc.completed_at,
  lpe.title as exercise_title
FROM virtual_repeat_completions vrc
LEFT JOIN learning_path_exercises lpe ON lpe.id = vrc.exercise_id
WHERE vrc.completed_at > CURRENT_DATE
ORDER BY vrc.completed_at DESC;

-- Check repeat progress per exercise
SELECT 
  exercise_id,
  COUNT(DISTINCT repeat_number) as repeats_completed
FROM virtual_repeat_completions
WHERE completed_at > CURRENT_DATE
GROUP BY exercise_id;
```

**What to test:**
- Find exercise with repeat_count > 1
- Toggle individual repeat checkboxes (Repetition 2, 3, etc.)
- Sound + vibration on each toggle
- Check rows appear in table

---

### 7. **`beta_feedback`** - Beta Testing Submissions
**Check beta feedback:**
```sql
-- View feedback submitted today
SELECT 
  name,
  rating,
  feedback,
  role,
  created_at,
  media_urls
FROM beta_feedback
WHERE created_at > CURRENT_DATE
ORDER BY created_at DESC;

-- Count by rating
SELECT 
  rating,
  COUNT(*) as count
FROM beta_feedback
WHERE created_at > CURRENT_DATE
GROUP BY rating
ORDER BY rating DESC;
```

**What to test:**
- Open BetaTestingSheet
- Fill name, rating (1-5 stars), feedback
- Add 1-2 images
- Click Submit
- Should see upload progress "Uploading media 1/2..."
- Check `media_urls` JSON array has image URLs

---

### 8. **`route_reviews`** - Route Reviews
**Check reviews submitted:**
```sql
-- View reviews from today
SELECT 
  rr.id,
  rr.route_id,
  rr.user_id,
  rr.rating,
  rr.content,
  rr.difficulty,
  rr.created_at,
  r.name as route_name
FROM route_reviews rr
LEFT JOIN routes r ON r.id = rr.route_id
WHERE rr.created_at > CURRENT_DATE
ORDER BY rr.created_at DESC;
```

**What to test:**
- Mark route as driven (first time)
- Fill out review on AddReviewScreen
- Submit review
- Check row appears in `route_reviews`

---

### 9. **`map_preset_routes`** - Collection Routes
**Check routes added to collections:**
```sql
-- View routes added to collections today
SELECT 
  mpr.preset_id,
  mpr.route_id,
  mpr.added_at,
  mp.name as collection_name,
  r.name as route_name
FROM map_preset_routes mpr
LEFT JOIN map_presets mp ON mp.id = mpr.preset_id
LEFT JOIN routes r ON r.id = mpr.route_id
WHERE mpr.added_at > CURRENT_DATE
ORDER BY mpr.added_at DESC;
```

**What to test:**
- Open RouteDetailSheet
- Click "Add to Collection"
- Select a collection
- Check row appears in table

---

### 10. **`exercise_completion_audit`** - Supervisor Audit Log
**Check supervisor activity:**
```sql
-- View audit log from today
SELECT 
  exercise_id,
  student_id,
  supervisor_id,
  actor_name,
  action,
  repeat_number,
  created_at
FROM exercise_completion_audit
WHERE created_at > CURRENT_DATE
ORDER BY created_at DESC
LIMIT 50;
```

**What to test (requires supervisor account):**
- Switch to student view as supervisor
- Toggle student's exercise completion
- Check audit row appears with supervisor info

---

## 🚨 Common Issues & Solutions

### **Issue: Translations Not Showing**
**Symptoms:** Seeing "filters.difficulty.beginner" instead of "Beginner"

**Fix:**
1. Run `FILTER_TRANSLATIONS.sql` in Supabase
2. Clear app cache: `npx expo start --clear`
3. Reload app: `Cmd+D` → Reload
4. **Fallback:** Even if DB fails, hardcoded fallbacks should show correct text now!

---

### **Issue: Media Not Uploading**
**Symptoms:** Route created but `media_attachments` is empty/null

**Fix:**
1. Check network connection
2. Verify images are < 10MB each
3. Look for upload progress indicator
4. Check Supabase Storage → `media` bucket

---

### **Issue: Sound Not Playing**
**Symptoms:** No sound when completing exercises or saving routes

**Fix:**
1. Check device is NOT in silent mode
2. Check Mac/simulator volume is up
3. Try real iOS device (simulator sound can be unreliable)
4. **Expected:** Haptic feedback should ALWAYS work, even when muted

---

### **Issue: RouteCreationBanner Not Visible**
**Symptoms:** Can't see banner on MapScreen

**Fix:**
1. Check you haven't created any routes yet
2. Banner should be at `bottom: 180px` (above RoutesDrawer)
3. If dismissed, it won't show again (by design)

---

## 📊 Quick Health Check Query

Run this to see today's activity:

```sql
SELECT 
  'Routes Created' as metric,
  COUNT(*) as count
FROM routes
WHERE created_at > CURRENT_DATE

UNION ALL

SELECT 
  'Exercises Completed' as metric,
  COUNT(*) as count
FROM learning_path_exercise_completions
WHERE completed_at > CURRENT_DATE

UNION ALL

SELECT 
  'Routes Saved' as metric,
  COUNT(*) as count
FROM saved_routes
WHERE saved_at > CURRENT_DATE

UNION ALL

SELECT 
  'Beta Feedback' as metric,
  COUNT(*) as count
FROM beta_feedback
WHERE created_at > CURRENT_DATE

UNION ALL

SELECT 
  'Reviews Submitted' as metric,
  COUNT(*) as count
FROM route_reviews
WHERE created_at > CURRENT_DATE;
```

Expected: Numbers should increase as you test each feature.

---

**Last Updated:** November 4, 2025

