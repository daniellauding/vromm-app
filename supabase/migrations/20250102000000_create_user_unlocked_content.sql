-- Create table to store successful password unlocks per user
CREATE TABLE IF NOT EXISTS public.user_unlocked_content (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id TEXT NOT NULL, -- learning_path.id or learning_path_exercises.id
    content_type TEXT NOT NULL CHECK (content_type IN ('learning_path', 'exercise')),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one unlock record per user/content combination
    UNIQUE(user_id, content_id, content_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_unlocked_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own unlocks" ON public.user_unlocked_content
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocks" ON public.user_unlocked_content
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unlocks" ON public.user_unlocked_content
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_content_user_id 
    ON public.user_unlocked_content(user_id);

CREATE INDEX IF NOT EXISTS idx_user_unlocked_content_lookup 
    ON public.user_unlocked_content(user_id, content_id, content_type);

-- Add helpful comments
COMMENT ON TABLE public.user_unlocked_content IS 'Stores successful password unlocks per user to avoid re-entering passwords';
COMMENT ON COLUMN public.user_unlocked_content.content_id IS 'ID of the learning path or exercise that was unlocked';
COMMENT ON COLUMN public.user_unlocked_content.content_type IS 'Type of content: learning_path or exercise'; 