-- ============================================
-- Enable Quiz for "Testar quiz" Exercise
-- ============================================
-- Run this AFTER running add_quiz_columns_to_exercises.sql

-- Enable quiz for your test exercise
UPDATE public.learning_path_exercises 
SET 
    has_quiz = true,           -- Enable quiz
    quiz_required = false,     -- Make it optional (change to true if required)
    quiz_pass_score = 70       -- 70% passing score
WHERE id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982';

-- Verify the update
SELECT 
    id,
    title,
    has_quiz,
    quiz_required,
    quiz_pass_score,
    is_featured
FROM public.learning_path_exercises 
WHERE id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982';

