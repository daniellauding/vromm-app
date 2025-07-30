-- Fix route_exercise_completions table by adding missing user_id column
-- This version handles existing NULL records properly

-- Add user_id column as nullable first if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'route_exercise_completions' 
        AND column_name = 'user_id'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE route_exercise_completions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added user_id column (nullable) to route_exercise_completions';
    ELSE
        RAISE NOTICE 'user_id column already exists in route_exercise_completions';
    END IF;
END $$;

-- Update existing records to populate user_id from session
UPDATE route_exercise_completions 
SET user_id = (
    SELECT user_id 
    FROM route_exercise_sessions 
    WHERE route_exercise_sessions.id = route_exercise_completions.session_id
)
WHERE user_id IS NULL;

-- Delete any records that still have NULL user_id (orphaned records)
DELETE FROM route_exercise_completions WHERE user_id IS NULL;

-- Now make the column NOT NULL
DO $$ 
BEGIN
    -- Check if column exists and is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'route_exercise_completions' 
        AND column_name = 'user_id'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE route_exercise_completions 
        ALTER COLUMN user_id SET NOT NULL;
        
        RAISE NOTICE 'Made user_id column NOT NULL';
    ELSE
        RAISE NOTICE 'user_id column is already NOT NULL or does not exist';
    END IF;
END $$;

-- Add index for user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_route_exercise_completions_user') THEN
        CREATE INDEX idx_route_exercise_completions_user ON route_exercise_completions(user_id);
        RAISE NOTICE 'Created index on route_exercise_completions.user_id';
    ELSE
        RAISE NOTICE 'Index on route_exercise_completions.user_id already exists';
    END IF;
END $$;

-- Add index for user_id + exercise_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_route_exercise_completions_user_exercise') THEN
        CREATE INDEX idx_route_exercise_completions_user_exercise ON route_exercise_completions(user_id, exercise_id);
        RAISE NOTICE 'Created index on route_exercise_completions(user_id, exercise_id)';
    ELSE
        RAISE NOTICE 'Index on route_exercise_completions(user_id, exercise_id) already exists';
    END IF;
END $$;

-- Update RLS policies to include user_id access
DROP POLICY IF EXISTS "Users can view their own route exercise completions" ON route_exercise_completions;
DROP POLICY IF EXISTS "Users can insert their own route exercise completions" ON route_exercise_completions;
DROP POLICY IF EXISTS "Users can update their own route exercise completions" ON route_exercise_completions;

CREATE POLICY "Users can view their own route exercise completions" 
ON route_exercise_completions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own route exercise completions" 
ON route_exercise_completions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own route exercise completions" 
ON route_exercise_completions FOR UPDATE 
USING (auth.uid() = user_id);

-- Also check if quiz tables exist for the interactive quiz functionality
-- Create quiz_questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_questions') THEN
        CREATE TABLE quiz_questions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          exercise_id TEXT NOT NULL, -- References route exercises or learning path exercises
          question_text JSONB NOT NULL, -- Multilingual: {"en": "Question text", "sv": "Frågetext"}
          question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
          explanation_text JSONB, -- Multilingual explanation
          points INTEGER DEFAULT 1,
          order_index INTEGER DEFAULT 0,
          image TEXT, -- Optional image URL
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_quiz_questions_exercise ON quiz_questions(exercise_id);
        CREATE INDEX idx_quiz_questions_order ON quiz_questions(exercise_id, order_index);
        
        -- Enable RLS
        ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies (allow all authenticated users to read quiz questions)
        CREATE POLICY "Authenticated users can view quiz questions" 
        ON quiz_questions FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE 'Created quiz_questions table';
    ELSE
        RAISE NOTICE 'quiz_questions table already exists';
    END IF;
END $$;

-- Create quiz_answers table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_answers') THEN
        CREATE TABLE quiz_answers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
          answer_text JSONB NOT NULL, -- Multilingual: {"en": "Answer text", "sv": "Svarstext"}
          is_correct BOOLEAN DEFAULT FALSE,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);
        CREATE INDEX idx_quiz_answers_order ON quiz_answers(question_id, order_index);
        
        -- Enable RLS
        ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies (allow all authenticated users to read quiz answers)
        CREATE POLICY "Authenticated users can view quiz answers" 
        ON quiz_answers FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE 'Created quiz_answers table';
    ELSE
        RAISE NOTICE 'quiz_answers table already exists';
    END IF;
END $$;

-- Create quiz_attempts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_attempts') THEN
        CREATE TABLE quiz_attempts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          exercise_id TEXT NOT NULL, -- References route exercises or learning path exercises
          attempt_number INTEGER DEFAULT 1,
          total_questions INTEGER NOT NULL,
          correct_answers INTEGER DEFAULT 0,
          score_percentage NUMERIC(5,2) DEFAULT 0,
          time_spent_seconds INTEGER DEFAULT 0,
          is_completed BOOLEAN DEFAULT FALSE,
          passed BOOLEAN DEFAULT FALSE,
          pass_threshold INTEGER DEFAULT 70,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
        CREATE INDEX idx_quiz_attempts_exercise ON quiz_attempts(exercise_id);
        CREATE INDEX idx_quiz_attempts_user_exercise ON quiz_attempts(user_id, exercise_id);
        
        -- Enable RLS
        ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies
        CREATE POLICY "Users can view their own quiz attempts" 
        ON quiz_attempts FOR SELECT 
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own quiz attempts" 
        ON quiz_attempts FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own quiz attempts" 
        ON quiz_attempts FOR UPDATE 
        USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Created quiz_attempts table';
    ELSE
        RAISE NOTICE 'quiz_attempts table already exists';
    END IF;
END $$;

-- Create quiz_question_attempts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_question_attempts') THEN
        CREATE TABLE quiz_question_attempts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
          selected_answer_ids UUID[] NOT NULL, -- Array of selected answer IDs
          is_correct BOOLEAN DEFAULT FALSE,
          time_spent_seconds INTEGER DEFAULT 0,
          points_earned INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_quiz_question_attempts_attempt ON quiz_question_attempts(attempt_id);
        CREATE INDEX idx_quiz_question_attempts_question ON quiz_question_attempts(question_id);
        
        -- Enable RLS
        ALTER TABLE quiz_question_attempts ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies (users can access attempts they own)
        CREATE POLICY "Users can view their own quiz question attempts" 
        ON quiz_question_attempts FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM quiz_attempts 
            WHERE quiz_attempts.id = quiz_question_attempts.attempt_id 
            AND quiz_attempts.user_id = auth.uid()
          )
        );
        
        CREATE POLICY "Users can insert their own quiz question attempts" 
        ON quiz_question_attempts FOR INSERT 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM quiz_attempts 
            WHERE quiz_attempts.id = quiz_question_attempts.attempt_id 
            AND quiz_attempts.user_id = auth.uid()
          )
        );
        
        RAISE NOTICE 'Created quiz_question_attempts table';
    ELSE
        RAISE NOTICE 'quiz_question_attempts table already exists';
    END IF;
END $$;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_updated_at_quiz_questions') THEN
        CREATE TRIGGER set_updated_at_quiz_questions
            BEFORE UPDATE ON quiz_questions
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created trigger for quiz_questions.updated_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_updated_at_quiz_answers') THEN
        CREATE TRIGGER set_updated_at_quiz_answers
            BEFORE UPDATE ON quiz_answers
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created trigger for quiz_answers.updated_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_updated_at_quiz_attempts') THEN
        CREATE TRIGGER set_updated_at_quiz_attempts
            BEFORE UPDATE ON quiz_attempts
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created trigger for quiz_attempts.updated_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_updated_at_route_exercise_sessions') THEN
        CREATE TRIGGER set_updated_at_route_exercise_sessions
            BEFORE UPDATE ON route_exercise_sessions
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created trigger for route_exercise_sessions.updated_at';
    END IF;
END $$;

-- Final check - display table structures
SELECT 'route_exercise_completions columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'route_exercise_completions' 
ORDER BY ordinal_position;

SELECT 'Quiz tables status:' as info;
SELECT table_name 
FROM pg_tables 
WHERE schemaname = 'public' 
AND table_name IN ('quiz_questions', 'quiz_answers', 'quiz_attempts', 'quiz_question_attempts')
ORDER BY table_name; 