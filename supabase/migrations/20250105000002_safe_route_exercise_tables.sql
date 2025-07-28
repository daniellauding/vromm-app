-- Safe migration for route exercise tables
-- This will only create what doesn't already exist

-- Create route_exercise_sessions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_exercise_sessions') THEN
        CREATE TABLE route_exercise_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'cancelled')) DEFAULT 'in_progress',
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          exercises_completed INTEGER DEFAULT 0,
          current_exercise_index INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created route_exercise_sessions table';
    ELSE
        RAISE NOTICE 'route_exercise_sessions table already exists';
    END IF;
END $$;

-- Create route_exercise_completions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_exercise_completions') THEN
        CREATE TABLE route_exercise_completions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES route_exercise_sessions(id) ON DELETE CASCADE,
          exercise_id TEXT NOT NULL, -- This is the route exercise ID, not learning path exercise ID
          completed_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(session_id, exercise_id)
        );
        
        RAISE NOTICE 'Created route_exercise_completions table';
    ELSE
        RAISE NOTICE 'route_exercise_completions table already exists';
    END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_route_exercise_sessions_route_user') THEN
        CREATE INDEX idx_route_exercise_sessions_route_user ON route_exercise_sessions(route_id, user_id);
        RAISE NOTICE 'Created index idx_route_exercise_sessions_route_user';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_route_exercise_sessions_user_status') THEN
        CREATE INDEX idx_route_exercise_sessions_user_status ON route_exercise_sessions(user_id, status);
        RAISE NOTICE 'Created index idx_route_exercise_sessions_user_status';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_route_exercise_completions_session') THEN
        CREATE INDEX idx_route_exercise_completions_session ON route_exercise_completions(session_id);
        RAISE NOTICE 'Created index idx_route_exercise_completions_session';
    END IF;
END $$;

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    -- Enable RLS on route_exercise_sessions
    IF NOT EXISTS (
        SELECT FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE n.nspname = 'public' AND c.relname = 'route_exercise_sessions' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE route_exercise_sessions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on route_exercise_sessions';
    END IF;
    
    -- Enable RLS on route_exercise_completions
    IF NOT EXISTS (
        SELECT FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE n.nspname = 'public' AND c.relname = 'route_exercise_completions' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE route_exercise_completions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on route_exercise_completions';
    END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    -- Route exercise sessions policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'route_exercise_sessions' AND policyname = 'Users can view their own route exercise sessions') THEN
        CREATE POLICY "Users can view their own route exercise sessions" 
        ON route_exercise_sessions FOR SELECT 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for route_exercise_sessions';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'route_exercise_sessions' AND policyname = 'Users can insert their own route exercise sessions') THEN
        CREATE POLICY "Users can insert their own route exercise sessions" 
        ON route_exercise_sessions FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for route_exercise_sessions';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'route_exercise_sessions' AND policyname = 'Users can update their own route exercise sessions') THEN
        CREATE POLICY "Users can update their own route exercise sessions" 
        ON route_exercise_sessions FOR UPDATE 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for route_exercise_sessions';
    END IF;
    
    -- Route exercise completions policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'route_exercise_completions' AND policyname = 'Users can view their own route exercise completions') THEN
        CREATE POLICY "Users can view their own route exercise completions" 
        ON route_exercise_completions FOR SELECT 
        USING (auth.uid() = (SELECT user_id FROM route_exercise_sessions WHERE id = session_id));
        RAISE NOTICE 'Created SELECT policy for route_exercise_completions';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'route_exercise_completions' AND policyname = 'Users can insert their own route exercise completions') THEN
        CREATE POLICY "Users can insert their own route exercise completions" 
        ON route_exercise_completions FOR INSERT 
        WITH CHECK (auth.uid() = (SELECT user_id FROM route_exercise_sessions WHERE id = session_id));
        RAISE NOTICE 'Created INSERT policy for route_exercise_completions';
    END IF;
END $$;

-- Add trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE event_object_table = 'route_exercise_sessions' 
        AND trigger_name = 'set_updated_at_route_exercise_sessions'
    ) THEN
        CREATE TRIGGER set_updated_at_route_exercise_sessions
          BEFORE UPDATE ON route_exercise_sessions
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created updated_at trigger for route_exercise_sessions';
    END IF;
END $$; 