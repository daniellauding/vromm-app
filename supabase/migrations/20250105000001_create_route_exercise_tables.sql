-- Create table for route exercise sessions
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

-- Create table for route exercise completions
CREATE TABLE route_exercise_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES route_exercise_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL, -- This is the route exercise ID, not learning path exercise ID
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, exercise_id)
);

-- Add indexes for better performance
CREATE INDEX idx_route_exercise_sessions_route_user ON route_exercise_sessions(route_id, user_id);
CREATE INDEX idx_route_exercise_sessions_user_status ON route_exercise_sessions(user_id, status);
CREATE INDEX idx_route_exercise_completions_session ON route_exercise_completions(session_id);

-- Add RLS policies
ALTER TABLE route_exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_exercise_completions ENABLE ROW LEVEL SECURITY;

-- Route exercise sessions policies
CREATE POLICY "Users can view their own route exercise sessions" 
ON route_exercise_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own route exercise sessions" 
ON route_exercise_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own route exercise sessions" 
ON route_exercise_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Route exercise completions policies
CREATE POLICY "Users can view their own route exercise completions" 
ON route_exercise_completions FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM route_exercise_sessions WHERE id = session_id));

CREATE POLICY "Users can insert their own route exercise completions" 
ON route_exercise_completions FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM route_exercise_sessions WHERE id = session_id));

-- Add updated_at trigger for route_exercise_sessions
CREATE TRIGGER set_updated_at_route_exercise_sessions
  BEFORE UPDATE ON route_exercise_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at(); 