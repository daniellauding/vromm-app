-- =====================================================
-- Add missing 'quiz_type' column to quiz_attempts table
-- =====================================================
-- Run this in Supabase SQL Editor to fix the quiz save error

-- Add quiz_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'quiz_type'
  ) THEN
    ALTER TABLE public.quiz_attempts 
    ADD COLUMN quiz_type text DEFAULT 'learning_path';
    
    COMMENT ON COLUMN public.quiz_attempts.quiz_type IS 'Type of quiz: learning_path, assessment, etc.';
    
    RAISE NOTICE '✅ Added quiz_type column to quiz_attempts';
  ELSE
    RAISE NOTICE '✅ quiz_type column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;

