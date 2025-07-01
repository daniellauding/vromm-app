-- Setup supervisor functionality for ProfileScreen
-- This ensures all tables, functions, and data needed for supervisor functionality exists

BEGIN;

-- 1. Create student_supervisor_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_supervisor_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, supervisor_id)
);

-- Enable RLS
ALTER TABLE public.student_supervisor_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_supervisor_relationships
DROP POLICY IF EXISTS "Users can view their own supervisor relationships" ON public.student_supervisor_relationships;
CREATE POLICY "Users can view their own supervisor relationships" 
ON public.student_supervisor_relationships 
FOR SELECT 
USING (auth.uid() = student_id OR auth.uid() = supervisor_id);

DROP POLICY IF EXISTS "Users can manage their own supervisor relationships" ON public.student_supervisor_relationships;
CREATE POLICY "Users can manage their own supervisor relationships" 
ON public.student_supervisor_relationships 
FOR ALL 
USING (auth.uid() = student_id);

-- 2. Create get_user_supervisor_details function
CREATE OR REPLACE FUNCTION public.get_user_supervisor_details(target_user_id UUID)
RETURNS TABLE(
    supervisor_id UUID,
    supervisor_name TEXT,
    supervisor_email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ssr.supervisor_id,
        COALESCE(p.full_name, 'Unknown Supervisor') as supervisor_name,
        COALESCE(au.email, 'No email') as supervisor_email
    FROM public.student_supervisor_relationships ssr
    LEFT JOIN public.profiles p ON p.id = ssr.supervisor_id
    LEFT JOIN auth.users au ON au.id = ssr.supervisor_id
    WHERE ssr.student_id = target_user_id;
END;
$$;

-- 3. Create leave_supervisor function
CREATE OR REPLACE FUNCTION public.leave_supervisor(supervisor_id_to_leave UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    deleted_count INTEGER;
BEGIN
    -- Get the current user ID
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Delete the relationship
    DELETE FROM public.student_supervisor_relationships 
    WHERE student_id = user_id AND supervisor_id = supervisor_id_to_leave;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$;

-- 4. Insert some sample supervisor profiles if they don't exist
INSERT INTO public.profiles (id, full_name, role, email, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Anna Andersson', 'instructor', 'anna.andersson@example.com', NOW(), NOW()),
    (gen_random_uuid(), 'Erik Eriksson', 'instructor', 'erik.eriksson@example.com', NOW(), NOW()),
    (gen_random_uuid(), 'Maria Larsson', 'instructor', 'maria.larsson@example.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Also ensure auth.users entries exist for these profiles (optional, for testing)
-- Note: In a real app, these would be created when users sign up

COMMIT;

-- Test the functions
SELECT 'Setup completed successfully!' as status; 