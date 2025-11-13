-- ============================================
-- VERIFY QUIZ DATABASE STRUCTURE
-- ============================================
-- Run this to check if quiz tables exist and have the correct structure

-- Check if exercise_quiz_questions table exists
SELECT 
    'exercise_quiz_questions' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exercise_quiz_questions'
ORDER BY ordinal_position;

-- Check if exercise_quiz_answers table exists
SELECT 
    'exercise_quiz_answers' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exercise_quiz_answers'
ORDER BY ordinal_position;

-- Check if quiz_attempts table exists (for storing user quiz results)
SELECT 
    'quiz_attempts' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts'
ORDER BY ordinal_position;

-- Check learning_path_exercises for quiz columns
SELECT 
    'learning_path_exercises' as table_name,
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'learning_path_exercises' 
  AND column_name IN ('has_quiz', 'quiz_required', 'quiz_pass_score')
ORDER BY column_name;

