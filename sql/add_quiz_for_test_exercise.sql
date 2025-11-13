-- Add quiz questions and answers for the "Testar quiz" exercise
-- Exercise ID: 2e1aaea5-8ae9-477b-9c71-5737ae33d982

-- First, check if questions already exist
SELECT id, question_text FROM public.exercise_quiz_questions
WHERE exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
ORDER BY order_index;

-- If no questions, insert them:

-- Question 1: Simple yes/no question
INSERT INTO public.exercise_quiz_questions (
  id,
  exercise_id,
  question_text,
  question_type,
  difficulty,
  points,
  category,
  order_index
) VALUES (
  gen_random_uuid(),
  '2e1aaea5-8ae9-477b-9c71-5737ae33d982',
  '{"en": "Is this a test quiz?", "sv": "Är detta ett test quiz?"}',
  'single_choice',
  'Easy',
  10,
  'General',
  0
)
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- Save the returned ID and use it for answers
-- Let's use a known UUID for easier reference
DO $$
DECLARE
  question1_id UUID := '11111111-1111-1111-1111-111111111111';
  question2_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Question 1
  INSERT INTO public.exercise_quiz_questions (
    id,
    exercise_id,
    question_text,
    question_type,
    difficulty,
    points,
    category,
    order_index
  ) VALUES (
    question1_id,
    '2e1aaea5-8ae9-477b-9c71-5737ae33d982',
    '{"en": "Is this a test quiz?", "sv": "Är detta ett test quiz?"}',
    'single_choice',
    'Easy',
    10,
    'General',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type;

  -- Answers for Question 1
  INSERT INTO public.exercise_quiz_answers (
    id,
    question_id,
    answer_text,
    is_correct,
    order_index
  ) VALUES
    (
      gen_random_uuid(),
      question1_id,
      '{"en": "Yes", "sv": "Ja"}',
      true,
      0
    ),
    (
      gen_random_uuid(),
      question1_id,
      '{"en": "No", "sv": "Nej"}',
      false,
      1
    )
  ON CONFLICT (id) DO NOTHING;

  -- Question 2: Multiple choice
  INSERT INTO public.exercise_quiz_questions (
    id,
    exercise_id,
    question_text,
    question_type,
    difficulty,
    points,
    category,
    order_index,
    explanation
  ) VALUES (
    question2_id,
    '2e1aaea5-8ae9-477b-9c71-5737ae33d982',
    '{"en": "Which of these are programming languages? (Select all that apply)", "sv": "Vilka av dessa är programmeringsspråk? (Välj alla som gäller)"}',
    'multiple_choice',
    'Medium',
    15,
    'Technology',
    1,
    '{"en": "JavaScript, Python, and Ruby are all programming languages. HTML is a markup language, not a programming language.", "sv": "JavaScript, Python och Ruby är alla programmeringsspråk. HTML är ett märkspråk, inte ett programmeringsspråk."}'
  )
  ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type;

  -- Answers for Question 2
  INSERT INTO public.exercise_quiz_answers (
    id,
    question_id,
    answer_text,
    is_correct,
    order_index
  ) VALUES
    (
      gen_random_uuid(),
      question2_id,
      '{"en": "JavaScript", "sv": "JavaScript"}',
      true,
      0
    ),
    (
      gen_random_uuid(),
      question2_id,
      '{"en": "Python", "sv": "Python"}',
      true,
      1
    ),
    (
      gen_random_uuid(),
      question2_id,
      '{"en": "HTML", "sv": "HTML"}',
      false,
      2
    ),
    (
      gen_random_uuid(),
      question2_id,
      '{"en": "Ruby", "sv": "Ruby"}',
      true,
      3
    )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Verify the questions and answers
SELECT 
  q.id,
  q.question_text,
  q.question_type,
  q.difficulty,
  q.points,
  q.order_index,
  (
    SELECT json_agg(
      json_build_object(
        'id', a.id,
        'answer_text', a.answer_text,
        'is_correct', a.is_correct,
        'order_index', a.order_index
      ) ORDER BY a.order_index
    )
    FROM public.exercise_quiz_answers a
    WHERE a.question_id = q.id
  ) as answers
FROM public.exercise_quiz_questions q
WHERE q.exercise_id = '2e1aaea5-8ae9-477b-9c71-5737ae33d982'
ORDER BY q.order_index;

