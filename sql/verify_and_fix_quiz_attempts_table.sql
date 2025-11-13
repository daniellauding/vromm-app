-- =====================================================
-- Verify and Fix quiz_attempts table structure
-- =====================================================
-- This ensures all required columns exist

-- Step 1: Check current table structure
SELECT 
  '📋 Current quiz_attempts columns:' as info,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if needed
DO $$ 
BEGIN
  -- Add quiz_type (required for the app)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'quiz_type'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN quiz_type text DEFAULT 'learning_path';
    
    COMMENT ON COLUMN public.quiz_attempts.quiz_type IS 'Type of quiz: learning_path, assessment, etc.';
    RAISE NOTICE '✅ Added quiz_type column';
  ELSE
    RAISE NOTICE '✅ quiz_type already exists';
  END IF;

  -- Add total_questions (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN total_questions integer DEFAULT 0;
    
    COMMENT ON COLUMN public.quiz_attempts.total_questions IS 'Total number of questions in the quiz';
    RAISE NOTICE '✅ Added total_questions column';
  ELSE
    RAISE NOTICE '✅ total_questions already exists';
  END IF;

  -- Add correct_answers (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN correct_answers integer DEFAULT 0;
    
    COMMENT ON COLUMN public.quiz_attempts.correct_answers IS 'Number of correct answers';
    RAISE NOTICE '✅ Added correct_answers column';
  ELSE
    RAISE NOTICE '✅ correct_answers already exists';
  END IF;

  -- Add score_percentage (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'score_percentage'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN score_percentage numeric(5,2) DEFAULT 0;
    
    COMMENT ON COLUMN public.quiz_attempts.score_percentage IS 'Score as percentage (0-100)';
    RAISE NOTICE '✅ Added score_percentage column';
  ELSE
    RAISE NOTICE '✅ score_percentage already exists';
  END IF;

  -- Add passed (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'passed'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN passed boolean DEFAULT false;
    
    COMMENT ON COLUMN public.quiz_attempts.passed IS 'Whether the user passed the quiz';
    RAISE NOTICE '✅ Added passed column';
  ELSE
    RAISE NOTICE '✅ passed already exists';
  END IF;

END $$;

-- Step 3: Verify final structure
SELECT 
  '✅ Final quiz_attempts structure:' as info,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;

-- Step 4: Show sample data (if any exists)
SELECT 
  '📊 Sample quiz attempts (if any):' as info,
  id,
  user_id,
  exercise_id,
  quiz_type,
  score_percentage,
  passed,
  completed_at
FROM public.quiz_attempts
LIMIT 5;

