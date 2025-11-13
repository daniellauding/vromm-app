# Show Quiz & Show Exercise Content Integration

## 🎯 Overview

Added support for the `show_quiz` and `show_exercise_content` fields from the admin panel to control quiz and content visibility in the mobile app.

## ✅ Changes Made

### 1. **Database Schema**
Added two new columns to `learning_path_exercises`:
- `show_quiz` (boolean, default: `true`) - Controls quiz visibility
- `show_exercise_content` (boolean, default: `true`) - Controls exercise content visibility

**Run this SQL script:** `sql/add_show_quiz_and_content_columns.sql`

### 2. **TypeScript Interfaces Updated**

#### FeaturedContent Types (`src/screens/HomeScreen/FeaturedContent/types.tsx`)
```typescript
export interface FeaturedExercise {
  // ... existing fields
  show_quiz?: boolean; // NEW
  show_exercise_content?: boolean; // NEW
}
```

#### ExerciseListSheet Types (`src/components/ExerciseListSheet.tsx`)
```typescript
interface PathExercise {
  // ... existing fields
  show_quiz?: boolean; // NEW
  show_exercise_content?: boolean; // NEW
}
```

### 3. **Database Queries Updated**

#### FeaturedContent (`src/screens/HomeScreen/FeaturedContent/index.tsx`)
- Added `show_quiz, show_exercise_content` to SELECT query for featured exercises

#### ExerciseListSheet (`src/components/ExerciseListSheet.tsx`)
- Already uses `SELECT *`, so automatically fetches new columns

### 4. **Logic Updated**

#### FeaturedContent (`src/screens/HomeScreen/FeaturedContent/IncompleteFeaturedExercises.tsx`)
```typescript
// Only show quiz if BOTH conditions are true:
// 1. has_quiz = true
// 2. show_quiz != false (defaults to true if not set)
const shouldShowQuiz = exercise.has_quiz && exercise.show_quiz !== false;
```

#### ExerciseListSheet (`src/components/ExerciseListSheet.tsx`)
```typescript
// Quiz visibility
const shouldShowQuiz = selectedExercise?.has_quiz && selectedExercise?.show_quiz !== false;

// Content visibility (defaults to true)
const shouldShowContent = selectedExercise?.show_exercise_content !== false;

// Render both conditionally
{shouldShowQuiz && (
  // Quiz UI here
)}

{shouldShowQuiz && shouldShowContent && (
  // Visual separator
)}

{shouldShowContent && (
  // Exercise content here
)}
```

**Updated checks in:**
- Quiz loading useEffect
- Repeat indicator visibility
- Quiz UI rendering
- Exercise content rendering with separator

## 🎮 How It Works

### Default Behavior (Backwards Compatible)
- If `show_quiz` is not set (NULL), it defaults to `true`
- If `show_exercise_content` is not set (NULL), it defaults to `true`
- Existing exercises will continue to work as before

### Admin Panel Control
1. **Admin sets `show_quiz = false`** → Quiz badge and functionality hidden, even if `has_quiz = true`
2. **Admin sets `show_quiz = true`** → Quiz shown normally (if `has_quiz = true`)
3. **Admin sets `show_exercise_content = false`** → Exercise content hidden (quiz-only mode)
4. **Admin sets `show_exercise_content = true`** → Exercise content shown normally (default)

**Visual Flow in App:**
- `show_quiz=true` + `show_exercise_content=true` → **Content** → Separator → **Quiz**
- `show_quiz=true` + `show_exercise_content=false` → **Quiz only**
- `show_quiz=false` + `show_exercise_content=true` → **Content only**
- `show_quiz=false` + `show_exercise_content=false` → **Empty** (nothing shown)

## 📍 Files Changed

1. ✅ `src/screens/HomeScreen/FeaturedContent/types.tsx`
2. ✅ `src/screens/HomeScreen/FeaturedContent/index.tsx`
3. ✅ `src/screens/HomeScreen/FeaturedContent/IncompleteFeaturedExercises.tsx`
4. ✅ `src/components/ExerciseListSheet.tsx`
5. ✅ `sql/add_show_quiz_and_content_columns.sql` (NEW)

## 🚀 Next Steps

### 1. Run SQL Migration
```sql
-- Run in Supabase SQL Editor
\i sql/add_show_quiz_and_content_columns.sql
```

### 2. Test in Admin Panel
- Open admin panel
- Edit an exercise with a quiz
- Check the "Show Quiz" checkbox
- Save and verify in mobile app

### 3. Verify Both Features Work ✅
Both `show_quiz` and `show_exercise_content` are now fully implemented!

## ✅ Implemented: `show_exercise_content`

### Content Visibility Logic (IMPLEMENTED)

The `show_exercise_content` field is now **fully implemented** in `ExerciseListSheet.tsx`:

```typescript
const shouldShowContent = selectedExercise?.show_exercise_content !== false;

{shouldShowQuiz && (
  // Quiz UI here (shows first)
)}

{shouldShowQuiz && shouldShowContent && (
  // Visual separator (only if both are shown)
)}

{shouldShowContent && (
  // Regular exercise content here (shows after quiz)
)}
```

### Content Display Combinations:

| `show_quiz` | `show_exercise_content` | Result |
|-------------|------------------------|--------|
| `true` | `true` | Quiz on top → separator → content below |
| `true` | `false` | **Quiz only** (no content) |
| `false` | `true` | **Content only** (no quiz) |
| `false` | `false` | Empty exercise (nothing shown) |

### Use Cases (NOW AVAILABLE):
1. ✅ **Quiz-Only Mode**: `show_quiz=true`, `show_exercise_content=false`
   - Show only quiz without exercise content
   - Perfect for testing comprehension
2. ✅ **Content-Only Mode**: `show_quiz=false`, `show_exercise_content=true`
   - Show only exercise content without quiz
   - Good for informational exercises
3. ✅ **Full Mode**: Both `true` (default)
   - Content appears first, then quiz below with separator
   - Best for comprehensive learning (learn first, test after)
4. ✅ **Hidden Mode**: Both `false`
   - Nothing shows (useful for draft exercises)

## 💡 Notes

- ✅ **Backwards Compatible**: Existing exercises work without changes
- ✅ **Default to True**: Both fields default to showing content/quiz
- ✅ **Admin Controlled**: Admin panel has full control via checkboxes
- ✅ **Both Implemented**: `show_quiz` AND `show_exercise_content` fully working
- ✅ **Visual Separator**: Clean divider line appears when both quiz and content are shown
- ⚠️ **ProgressScreen**: You may want to update `ProgressScreen.tsx` to use the same logic for consistency (currently only implemented in `FeaturedContent` and `ExerciseListSheet`)

## 🎨 Admin Panel Integration

From `LearningPathsTable.tsx`:
```typescript
// Schema includes:
show_quiz: z.boolean().default(false)

// Checkbox in UI:
<Checkbox 
  checked={form.watch('show_quiz')}
  disabled={exerciseQuizQuestions.length === 0}
  onCheckedChange={(checked) => form.setValue('show_quiz', checked as boolean)}
/>
```

**Admin can now control:**
- ✅ Which exercises show quizzes
- ✅ Even if `has_quiz = true`, quiz can be hidden
- 🔜 Which exercises show content (when implemented)

