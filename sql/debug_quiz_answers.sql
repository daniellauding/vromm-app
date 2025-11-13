-- =============================================
-- DEBUG QUIZ ANSWERS - Find out why answers are missing
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check if questions exist
SELECT 
  id,
  question_text->>'en' as question,
  question_type,
  order_index
FROM public.exercise_quiz_questions
WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
ORDER BY order_index;

-- Step 2: Check if answers exist
SELECT 
  question_id,
  answer_text->>'en' as answer,
  is_correct,
  order_index
FROM public.exercise_quiz_answers
WHERE question_id IN (
  SELECT id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
)
ORDER BY question_id, order_index;

-- Step 3: Count answers per question
SELECT 
  q.id as question_id,
  q.question_text->>'en' as question,
  COUNT(a.id) as answer_count
FROM public.exercise_quiz_questions q
LEFT JOIN public.exercise_quiz_answers a ON a.question_id = q.id
WHERE q.exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
GROUP BY q.id, q.question_text
ORDER BY q.order_index;

-- Step 4: Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'exercise_quiz_answers'
  AND tc.constraint_type = 'FOREIGN KEY';

