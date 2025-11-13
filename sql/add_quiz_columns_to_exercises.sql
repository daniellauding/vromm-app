-- ============================================
-- Add Quiz Support Columns to learning_path_exercises
-- ============================================
-- This migration adds quiz-related columns to support the new quiz feature
-- Run this in Supabase SQL Editor

-- Step 1: Add quiz columns to learning_path_exercises
ALTER TABLE public.learning_path_exercises 
ADD COLUMN IF NOT EXISTS has_quiz BOOLEAN DEFAULT false;

ALTER TABLE public.learning_path_exercises 
ADD COLUMN IF NOT EXISTS quiz_required BOOLEAN DEFAULT false;

ALTER TABLE public.learning_path_exercises 
ADD COLUMN IF NOT EXISTS quiz_pass_score INTEGER DEFAULT 70;

-- Add comments for documentation
COMMENT ON COLUMN public.learning_path_exercises.has_quiz IS 'Whether this exercise has an associated quiz';
COMMENT ON COLUMN public.learning_path_exercises.quiz_required IS 'Whether the quiz must be passed to complete the exercise';
COMMENT ON COLUMN public.learning_path_exercises.quiz_pass_score IS 'Minimum percentage score required to pass the quiz (0-100)';

-- Step 2: Add optional columns to exercise_quiz_questions (if they don't exist)
-- These are optional fields for enhanced quiz features
ALTER TABLE public.exercise_quiz_questions 
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

ALTER TABLE public.exercise_quiz_questions 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;

ALTER TABLE public.exercise_quiz_questions 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

ALTER TABLE public.exercise_quiz_questions 
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 60;

ALTER TABLE public.exercise_quiz_questions 
ADD COLUMN IF NOT EXISTS explanation JSONB DEFAULT '{"en": "", "sv": ""}'::jsonb;

-- Add comments
COMMENT ON COLUMN public.exercise_quiz_questions.difficulty IS 'Question difficulty: Easy, Medium, Hard, Expert';
COMMENT ON COLUMN public.exercise_quiz_questions.points IS 'Points awarded for correct answer';
COMMENT ON COLUMN public.exercise_quiz_questions.category IS 'Question category for filtering';
COMMENT ON COLUMN public.exercise_quiz_questions.time_limit IS 'Time limit in seconds';
COMMENT ON COLUMN public.exercise_quiz_questions.explanation IS 'Explanation shown after answer (jsonb: {en, sv})';

-- Verify the columns were added
SELECT 
    'learning_path_exercises' as table_name,
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'learning_path_exercises' 
  AND column_name IN ('has_quiz', 'quiz_required', 'quiz_pass_score')
UNION ALL
SELECT 
    'exercise_quiz_questions' as table_name,
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exercise_quiz_questions' 
  AND column_name IN ('difficulty', 'points', 'category', 'time_limit', 'explanation')
ORDER BY table_name, column_name;

-- ============================================
-- Example: Update an exercise to have a quiz
-- ============================================
-- Uncomment and modify the ID to enable quiz for a specific exercise:
-- UPDATE public.learning_path_exercises 
-- SET has_quiz = true, 
--     quiz_required = false, 
--     quiz_pass_score = 70
-- WHERE id = 'your-exercise-id-here';

