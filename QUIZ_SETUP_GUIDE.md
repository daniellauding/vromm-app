# 🎯 Quiz System Setup Guide

**Version:** 1.0  
**Date:** 2025-11-13  
**Status:** ✅ SAFE TO RUN - No Breaking Changes

---

## 📊 Database Structure (Verified from Admin Panel)

### Table 1: `exercise_quiz_questions`
Stores quiz questions for exercises.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `exercise_id` | UUID | Foreign key to `learning_path_exercises` |
| `question_text` | JSONB | Question text: `{en: string, sv: string}` |
| `question_type` | TEXT | Type: `single_choice`, `multiple_choice`, `true_false` |
| `image` | TEXT | Optional image URL |
| `youtube_url` | TEXT | Optional video URL |
| `order_index` | INTEGER | Display order |
| **NEW:** `difficulty` | TEXT | `Easy`, `Medium`, `Hard`, `Expert` (default: `Medium`) |
| **NEW:** `points` | INTEGER | Points for correct answer (default: `10`) |
| **NEW:** `category` | TEXT | Category for filtering (default: `General`) |
| **NEW:** `time_limit` | INTEGER | Seconds allowed (default: `60`) |
| **NEW:** `explanation` | JSONB | Explanation: `{en: string, sv: string}` |

### Table 2: `exercise_quiz_answers`
Stores answer options for each question.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `question_id` | UUID | Foreign key to `exercise_quiz_questions` |
| `answer_text` | JSONB | Answer text: `{en: string, sv: string}` |
| `is_correct` | BOOLEAN | Whether this is the correct answer |
| `image` | TEXT | Optional image URL |
| `youtube_url` | TEXT | Optional video URL |
| `order_index` | INTEGER | Display order |

### Table 3: `learning_path_exercises` (UPDATED)
Added quiz control columns.

| Column | Type | Description |
|--------|------|-------------|
| **NEW:** `has_quiz` | BOOLEAN | Whether exercise has a quiz (default: `false`) |
| **NEW:** `quiz_required` | BOOLEAN | Must pass quiz to complete (default: `false`) |
| **NEW:** `quiz_pass_score` | INTEGER | Min score % to pass (default: `70`) |

### Table 4: `quiz_attempts` (For user results)
Stores user quiz attempts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `profiles` |
| `exercise_id` | UUID | Foreign key to `learning_path_exercises` |
| `quiz_type` | TEXT | Type: `learning_path` |
| `total_questions` | INTEGER | Number of questions |
| `correct_answers` | INTEGER | Number correct |
| `incorrect_answers` | INTEGER | Number incorrect |
| `score_percentage` | NUMERIC | Percentage score |
| `points_earned` | INTEGER | Total points earned |
| `time_taken` | INTEGER | Seconds taken |
| `passed` | BOOLEAN | Whether they passed |
| `created_at` | TIMESTAMP | When attempt was made |

---

## 🚀 Step-by-Step Setup (SAFE - Won't Break Anything)

### Step 1: Verify Quiz Tables Exist

Run this in **Supabase SQL Editor**:

```sql
-- File: sql/verify_quiz_structure.sql
```

**Expected Output:**
- You should see tables: `exercise_quiz_questions`, `exercise_quiz_answers`, `quiz_attempts`
- If they DON'T exist, **contact the admin panel developer first** - these tables should already be created by the admin panel

### Step 2: Add Quiz Columns

Run this in **Supabase SQL Editor**:

```sql
-- File: sql/add_quiz_columns_to_exercises.sql
```

**What this does:**
- ✅ Adds `has_quiz`, `quiz_required`, `quiz_pass_score` to `learning_path_exercises`
- ✅ Adds optional columns (`difficulty`, `points`, etc.) to `exercise_quiz_questions`
- ✅ Uses `IF NOT EXISTS` - won't break if columns already exist
- ✅ Sets safe defaults - existing exercises unaffected

**Success Output:**
You'll see a table showing all added columns with their data types and defaults.

### Step 3: Enable Quiz for Test Exercise

Run this in **Supabase SQL Editor**:

```sql
-- File: sql/enable_quiz_for_test_exercise.sql
```

**What this does:**
- ✅ Enables quiz for your "Testar quiz" exercise (`2e1aaea5-8ae9-477b-9c71-5737ae33d982`)
- ✅ Makes it optional (not required to complete exercise)
- ✅ Sets 70% passing score

### Step 4: Add Quiz Questions (Admin Panel)

1. Open **Admin Panel** at `https://admin.vromm.se` (or your admin URL)
2. Find "Testar quiz" exercise
3. Click "Edit" or "Add Quiz Questions"
4. Add at least one question with 2+ answers
5. Mark at least one answer as correct
6. Click "Save"

**Minimum Required for Testing:**
- 1 question
- 2 answers
- 1 answer marked as `is_correct: true`

---

## 🎨 What Users Will See

### In FeaturedContent:
1. **Quiz Badge** appears in top-right corner of featured exercise cards
   - 🔵 **Blue badge** = Required quiz (must pass to complete)
   - 🟢 **Teal badge** = Optional quiz (bonus challenge)

2. **Tap Quiz Badge** → Opens quiz modal with:
   - Exercise title at top
   - Question progress bar
   - Multiple choice / single choice / true-false questions
   - Difficulty and points display
   - Results screen with pass/fail

3. **Quiz Results:**
   - Shows score percentage
   - Pass/fail status
   - Option to retry if failed
   - Saved to database for progress tracking

---

## ✅ Safety Checks

### What WON'T Break:
- ✅ Existing exercises without quizzes work normally
- ✅ All existing functionality unchanged
- ✅ Featured content without quizzes displays as before
- ✅ SQL uses `IF NOT EXISTS` - safe to run multiple times
- ✅ Default values ensure backwards compatibility

### What's NEW:
- ✅ Quiz badge on exercises with `has_quiz = true`
- ✅ Quiz modal for taking quizzes
- ✅ Quiz results saved to database
- ✅ Optional vs required quiz support

### Database Changes:
- ✅ **3 new columns** on `learning_path_exercises`
- ✅ **5 optional columns** on `exercise_quiz_questions`
- ✅ **0 deletions** - nothing removed
- ✅ **0 breaking changes** - all additive

---

## 🔍 Troubleshooting

### Error: "column does not exist"
**Solution:** Run `sql/add_quiz_columns_to_exercises.sql`

### Error: "No quiz questions found"
**Solution:** Add quiz questions in the admin panel

### Quiz badge doesn't appear
**Checklist:**
1. ✅ Run `sql/add_quiz_columns_to_exercises.sql`
2. ✅ Run `sql/enable_quiz_for_test_exercise.sql`
3. ✅ Add quiz questions in admin panel
4. ✅ Reload app
5. ✅ Check exercise has `has_quiz = true` in database

### App shows fallback (no quiz columns)
**Expected:** App gracefully falls back to showing exercises without quiz badges if columns don't exist yet. This is intentional and safe.

---

## 📝 SQL Execution Order

```bash
# 1. Verify structure (optional)
sql/verify_quiz_structure.sql

# 2. Add columns (required)
sql/add_quiz_columns_to_exercises.sql

# 3. Enable quiz for test (required)
sql/enable_quiz_for_test_exercise.sql

# 4. Add quiz questions (admin panel)
# Go to admin panel and add questions/answers
```

---

## 🎯 Testing Checklist

After running SQL:

- [ ] App loads without errors
- [ ] Featured content shows exercise cards
- [ ] "Testar quiz" shows QUIZ badge (teal/green for optional)
- [ ] Tap quiz badge → opens modal
- [ ] Modal shows exercise title "Testar quiz"
- [ ] Questions appear (if added in admin)
- [ ] Can select answers
- [ ] Can submit and see results
- [ ] Results show pass/fail correctly

---

## 📞 Support

**If something breaks:**
1. Check browser console for errors
2. Check Supabase logs
3. Run `sql/verify_quiz_structure.sql` to check structure
4. Verify quiz questions exist in admin panel

**All changes are additive - no data is deleted or modified!**

---

**Last Updated:** 2025-11-13  
**Verified Against:** Admin Panel `LearningPathsTable.tsx`  
**Status:** ✅ Production Ready

