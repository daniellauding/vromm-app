-- Create virtual_repeat_completions table for tracking individual repeat exercise progress
-- This table stores completion status for virtual repeats (exercise repetitions)
-- Virtual ID format: "exerciseId-virtual-2" where 2 is the repeat number

CREATE TABLE IF NOT EXISTS public.virtual_repeat_completions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL, -- References learning_path_exercises.id
    repeat_number INTEGER NOT NULL CHECK (repeat_number >= 2), -- Repeat 1 is the original exercise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one completion record per user/exercise/repeat combination
    UNIQUE(user_id, exercise_id, repeat_number)
);

-- Enable Row Level Security
ALTER TABLE public.virtual_repeat_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to ensure users can only see/modify their own completions
CREATE POLICY "Users can view their own repeat completions" 
    ON public.virtual_repeat_completions
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repeat completions" 
    ON public.virtual_repeat_completions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repeat completions" 
    ON public.virtual_repeat_completions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repeat completions" 
    ON public.virtual_repeat_completions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_virtual_repeat_completions_user_exercise 
    ON public.virtual_repeat_completions(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_virtual_repeat_completions_user_id 
    ON public.virtual_repeat_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_virtual_repeat_completions_exercise_id 
    ON public.virtual_repeat_completions(exercise_id);

-- Add trigger for automatically updating the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_virtual_repeat_completions_updated_at
    BEFORE UPDATE ON public.virtual_repeat_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.virtual_repeat_completions IS 'Stores completion status for virtual exercise repeats. Completion is tracked by presence/absence of record';
COMMENT ON COLUMN public.virtual_repeat_completions.exercise_id IS 'References the original exercise from learning_path_exercises';
COMMENT ON COLUMN public.virtual_repeat_completions.repeat_number IS 'Which repetition (2, 3, 4, etc.). Repeat 1 is tracked in learning_path_exercise_completions'; 