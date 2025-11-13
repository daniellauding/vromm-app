-- =====================================================
-- Add show_quiz and show_exercise_content columns
-- to learning_path_exercises table
-- =====================================================
-- 
-- Purpose: Add admin controls for showing/hiding quiz and exercise content
-- 
-- show_quiz: Controls whether the quiz badge and quiz functionality is visible
--            in FeaturedContent, ExerciseListSheet, and ProgressScreen
--            Defaults to TRUE (show quiz if has_quiz is true)
-- 
-- show_exercise_content: Controls whether the exercise content itself is visible
--                        Can be used to create quiz-only exercises or control
--                        what content is shown in different contexts
--                        Defaults to TRUE (show exercise content)
-- 
-- =====================================================

-- Add show_quiz column (defaults to true for backwards compatibility)
ALTER TABLE public.learning_path_exercises 
ADD COLUMN IF NOT EXISTS show_quiz BOOLEAN DEFAULT true;

-- Add show_exercise_content column (defaults to true for backwards compatibility)
ALTER TABLE public.learning_path_exercises 
ADD COLUMN IF NOT EXISTS show_exercise_content BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.learning_path_exercises.show_quiz IS 
'Controls whether quiz is visible in mobile app. Must also have has_quiz=true to show quiz. Defaults to true.';

COMMENT ON COLUMN public.learning_path_exercises.show_exercise_content IS 
'Controls whether exercise content is visible in mobile app. Can be used to create quiz-only exercises. Defaults to true.';

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'learning_path_exercises' 
  AND column_name IN ('show_quiz', 'show_exercise_content')
ORDER BY column_name;

-- Show sample data to verify defaults
SELECT 
  id,
  title->>'en' as title_en,
  has_quiz,
  show_quiz,
  show_exercise_content
FROM public.learning_path_exercises 
WHERE has_quiz = true
LIMIT 5;

