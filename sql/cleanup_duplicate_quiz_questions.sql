-- =============================================
-- CLEANUP DUPLICATE QUIZ QUESTIONS
-- Remove duplicate/broken questions and fix order_index
-- =============================================

-- First, let's see what we have
SELECT 
  id,
  order_index,
  question_text->>'en' as question,
  (SELECT COUNT(*) FROM exercise_quiz_answers WHERE question_id = exercise_quiz_questions.id) as answer_count
FROM public.exercise_quiz_questions
WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
ORDER BY order_index, created_at;

-- Delete ALL questions for this exercise (we'll re-insert clean ones)
DELETE FROM public.exercise_quiz_answers
WHERE question_id IN (
  SELECT id FROM public.exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
);

DELETE FROM public.exercise_quiz_questions
WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982';

-- Insert clean questions with proper order_index
INSERT INTO public.exercise_quiz_questions 
  (exercise_id, question_text, question_type, order_index, difficulty, category, points, time_limit, required)
VALUES
  -- Question 1
  ('2e1aaea5-8ae9-477b-9c71-5737ae33d982', 
   '{"en": "Is this a test quiz?", "sv": "Är detta ett test quiz?"}',
   'single_choice', 0, 'Easy', 'General', 10, 60, true),
  
  -- Question 2
  ('2e1aaea5-8ae9-477b-9c71-5737ae33d982',
   '{"en": "What is 2+2?", "sv": "Vad är 2+2?"}',
   'single_choice', 1, 'Easy', 'Math', 10, 30, true),
  
  -- Question 3
  ('2e1aaea5-8ae9-477b-9c71-5737ae33d982',
   '{"en": "What color is the sky?", "sv": "Vilken färg är himlen?"}',
   'single_choice', 2, 'Easy', 'General', 10, 30, true),
  
  -- Question 4
  ('2e1aaea5-8ae9-477b-9c71-5737ae33d982',
   '{"en": "Which of these are programming languages? (Select all that apply)", "sv": "Vilka av dessa är programmeringsspråk? (Välj alla som gäller)"}',
   'multiple_choice', 3, 'Medium', 'Technology', 15, 60, true),
  
  -- Question 5
  ('2e1aaea5-8ae9-477b-9c71-5737ae33d982',
   '{"en": "What is the capital of Sweden?", "sv": "Vad är huvudstaden i Sverige?"}',
   'single_choice', 4, 'Easy', 'Geography', 10, 30, true)
RETURNING id, order_index, question_text->>'en' as question;

-- Now insert answers for each question
DO $$
DECLARE
  q1_id UUID;
  q2_id UUID;
  q3_id UUID;
  q4_id UUID;
  q5_id UUID;
BEGIN
  -- Get the question IDs we just created
  SELECT id INTO q1_id FROM exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' AND order_index = 0;
  
  SELECT id INTO q2_id FROM exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' AND order_index = 1;
  
  SELECT id INTO q3_id FROM exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' AND order_index = 2;
  
  SELECT id INTO q4_id FROM exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' AND order_index = 3;
  
  SELECT id INTO q5_id FROM exercise_quiz_questions 
  WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982' AND order_index = 4;
  
  -- Question 1 answers
  INSERT INTO exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
  (q1_id, '{"en": "Yes, this is a test", "sv": "Ja, det här är ett test"}', true, 0),
  (q1_id, '{"en": "No, this is real", "sv": "Nej, det här är på riktigt"}', false, 1),
  (q1_id, '{"en": "Maybe", "sv": "Kanske"}', false, 2),
  (q1_id, '{"en": "I don''t know", "sv": "Jag vet inte"}', false, 3);
  
  -- Question 2 answers
  INSERT INTO exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
  (q2_id, '{"en": "3", "sv": "3"}', false, 0),
  (q2_id, '{"en": "4", "sv": "4"}', true, 1),
  (q2_id, '{"en": "5", "sv": "5"}', false, 2),
  (q2_id, '{"en": "6", "sv": "6"}', false, 3);
  
  -- Question 3 answers
  INSERT INTO exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
  (q3_id, '{"en": "Red", "sv": "Röd"}', false, 0),
  (q3_id, '{"en": "Blue", "sv": "Blå"}', true, 1),
  (q3_id, '{"en": "Green", "sv": "Grön"}', false, 2),
  (q3_id, '{"en": "Yellow", "sv": "Gul"}', false, 3);
  
  -- Question 4 answers (multiple choice - 3 correct!)
  INSERT INTO exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
  (q4_id, '{"en": "Python", "sv": "Python"}', true, 0),
  (q4_id, '{"en": "JavaScript", "sv": "JavaScript"}', true, 1),
  (q4_id, '{"en": "HTML", "sv": "HTML"}', false, 2),
  (q4_id, '{"en": "TypeScript", "sv": "TypeScript"}', true, 3);
  
  -- Question 5 answers
  INSERT INTO exercise_quiz_answers (question_id, answer_text, is_correct, order_index) VALUES
  (q5_id, '{"en": "Oslo", "sv": "Oslo"}', false, 0),
  (q5_id, '{"en": "Stockholm", "sv": "Stockholm"}', true, 1),
  (q5_id, '{"en": "Copenhagen", "sv": "Köpenhamn"}', false, 2),
  (q5_id, '{"en": "Helsinki", "sv": "Helsingfors"}', false, 3);
  
  RAISE NOTICE 'Successfully created 5 questions with answers';
END $$;

-- Verify the cleanup worked
SELECT 
  q.order_index,
  q.question_text->>'en' as question,
  q.question_type,
  COUNT(a.id) as answer_count,
  STRING_AGG(a.answer_text->>'en', ' | ' ORDER BY a.order_index) as answers
FROM exercise_quiz_questions q
LEFT JOIN exercise_quiz_answers a ON a.question_id = q.id
WHERE q.exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
GROUP BY q.id, q.order_index, q.question_text, q.question_type
ORDER BY q.order_index;

