-- =============================================
-- FIX QUIZ ANSWERS - Insert missing answers
-- Run this AFTER debug_quiz_answers.sql
-- =============================================

-- First, delete any existing answers for this exercise to start fresh
DELETE FROM public.exercise_quiz_answers
WHERE question_id IN (
  SELECT id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
);

-- Get the question IDs (we'll use these in the inserts below)
-- You may need to update these IDs based on the output from debug_quiz_answers.sql
DO $$
DECLARE
  question1_id UUID;
  question2_id UUID;
  question3_id UUID;
  question4_id UUID;
  question5_id UUID;
BEGIN
  -- Get question IDs by their text (more reliable than hardcoded IDs)
  SELECT id INTO question1_id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' 
    AND question_text->>'en' = 'Is this a test quiz?';
    
  SELECT id INTO question2_id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' 
    AND question_text->>'en' = 'What is 2+2?';
    
  SELECT id INTO question3_id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' 
    AND question_text->>'en' = 'What color is the sky?';
    
  SELECT id INTO question4_id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' 
    AND question_text->>'en' = 'Which of these are programming languages?';
    
  SELECT id INTO question5_id 
  FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' 
    AND question_text->>'en' = 'What is the capital of Sweden?';
  
  -- Raise notice to show what we found
  RAISE NOTICE 'Found question IDs: %, %, %, %, %', question1_id, question2_id, question3_id, question4_id, question5_id;
  
  -- Insert answers for Question 1: "Is this a test quiz?"
  IF question1_id IS NOT NULL THEN
    INSERT INTO public.exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
    (question1_id, '{"en": "Yes, this is a test", "sv": "Ja, det här är ett test"}', true, 0),
    (question1_id, '{"en": "No, this is real", "sv": "Nej, det här är på riktigt"}', false, 1),
    (question1_id, '{"en": "Maybe", "sv": "Kanske"}', false, 2),
    (question1_id, '{"en": "I don''t know", "sv": "Jag vet inte"}', false, 3);
    RAISE NOTICE 'Inserted answers for question 1';
  END IF;
  
  -- Insert answers for Question 2: "What is 2+2?"
  IF question2_id IS NOT NULL THEN
    INSERT INTO public.exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
    (question2_id, '{"en": "3", "sv": "3"}', false, 0),
    (question2_id, '{"en": "4", "sv": "4"}', true, 1),
    (question2_id, '{"en": "5", "sv": "5"}', false, 2),
    (question2_id, '{"en": "6", "sv": "6"}', false, 3);
    RAISE NOTICE 'Inserted answers for question 2';
  END IF;
  
  -- Insert answers for Question 3: "What color is the sky?"
  IF question3_id IS NOT NULL THEN
    INSERT INTO public.exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
    (question3_id, '{"en": "Red", "sv": "Röd"}', false, 0),
    (question3_id, '{"en": "Blue", "sv": "Blå"}', true, 1),
    (question3_id, '{"en": "Green", "sv": "Grön"}', false, 2),
    (question3_id, '{"en": "Yellow", "sv": "Gul"}', false, 3);
    RAISE NOTICE 'Inserted answers for question 3';
  END IF;
  
  -- Insert answers for Question 4: "Which of these are programming languages?" (multiple choice)
  IF question4_id IS NOT NULL THEN
    INSERT INTO public.exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
    (question4_id, '{"en": "Python", "sv": "Python"}', true, 0),
    (question4_id, '{"en": "JavaScript", "sv": "JavaScript"}', true, 1),
    (question4_id, '{"en": "HTML", "sv": "HTML"}', false, 2),
    (question4_id, '{"en": "TypeScript", "sv": "TypeScript"}', true, 3);
    RAISE NOTICE 'Inserted answers for question 4';
  END IF;
  
  -- Insert answers for Question 5: "What is the capital of Sweden?"
  IF question5_id IS NOT NULL THEN
    INSERT INTO public.exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
    (question5_id, '{"en": "Oslo", "sv": "Oslo"}', false, 0),
    (question5_id, '{"en": "Stockholm", "sv": "Stockholm"}', true, 1),
    (question5_id, '{"en": "Copenhagen", "sv": "Köpenhamn"}', false, 2),
    (question5_id, '{"en": "Helsinki", "sv": "Helsingfors"}', false, 3);
    RAISE NOTICE 'Inserted answers for question 5';
  END IF;
  
END $$;

-- Verify the answers were inserted
SELECT 
  q.order_index as q_order,
  q.question_text->>'en' as question,
  q.question_type,
  COUNT(a.id) as answer_count,
  STRING_AGG(a.answer_text->>'en', ' | ' ORDER BY a.order_index) as answers
FROM public.exercise_quiz_questions q
LEFT JOIN public.exercise_quiz_answers a ON a.question_id = q.id
WHERE q.exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
GROUP BY q.id, q.order_index, q.question_text, q.question_type
ORDER BY q.order_index;

