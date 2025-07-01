-- CLEAN SUPERVISOR & SCHOOL SETUP - NO SYNTAX ERRORS
-- Run this version if you get syntax errors

-- 1. CREATE SUPERVISOR RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.student_supervisor_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(student_id, supervisor_id)
);

-- 2. FIX SCHOOL_MEMBERSHIPS RLS POLICIES
DROP POLICY IF EXISTS "school_memberships_policy" ON public.school_memberships;
DROP POLICY IF EXISTS "Users can manage their own school memberships" ON public.school_memberships;

ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view school memberships" 
  ON public.school_memberships FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own school memberships" 
  ON public.school_memberships FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own school memberships" 
  ON public.school_memberships FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own school memberships" 
  ON public.school_memberships FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. CREATE RLS POLICIES FOR SUPERVISOR RELATIONSHIPS
ALTER TABLE public.student_supervisor_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their supervisor relationships" 
  ON public.student_supervisor_relationships FOR SELECT 
  USING (auth.uid() = student_id OR auth.uid() = supervisor_id);

CREATE POLICY "Students can manage their supervisor relationships" 
  ON public.student_supervisor_relationships FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their supervisor relationships" 
  ON public.student_supervisor_relationships FOR UPDATE 
  USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their supervisor relationships" 
  ON public.student_supervisor_relationships FOR DELETE 
  USING (auth.uid() = student_id);

-- 4. DROP AND RECREATE FUNCTIONS
DROP FUNCTION IF EXISTS get_user_supervisor_details(uuid);
DROP FUNCTION IF EXISTS get_user_school_details(uuid);
DROP FUNCTION IF EXISTS leave_supervisor(uuid);
DROP FUNCTION IF EXISTS leave_school(uuid);

-- 5. CREATE SUPERVISOR FUNCTIONS
CREATE OR REPLACE FUNCTION get_user_supervisor_details(target_user_id uuid)
RETURNS TABLE (
  supervisor_id uuid,
  supervisor_name text,
  supervisor_email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as supervisor_id,
    p.full_name as supervisor_name,
    p.email as supervisor_email
  FROM public.student_supervisor_relationships ssr
  JOIN public.profiles p ON p.id = ssr.supervisor_id
  WHERE ssr.student_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION leave_supervisor(supervisor_id_to_leave uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.student_supervisor_relationships 
  WHERE student_id = auth.uid() 
    AND supervisor_id = supervisor_id_to_leave;
  
  RETURN FOUND;
END;
$$;

-- 6. CREATE SCHOOL FUNCTIONS  
CREATE OR REPLACE FUNCTION get_user_school_details(target_user_id uuid)
RETURNS TABLE (
  school_id uuid,
  school_name text,
  school_location text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    COALESCE(s.location, s.address, s.city) as school_location
  FROM public.school_memberships sm
  JOIN public.schools s ON s.id = sm.school_id
  WHERE sm.user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION leave_school(school_id_to_leave uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.school_memberships 
  WHERE user_id = auth.uid() 
    AND school_id = school_id_to_leave;
  
  RETURN FOUND;
END;
$$;

-- 7. ADD MISSING FIELDS TO SCHOOLS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'schools' AND column_name = 'location') THEN
    ALTER TABLE public.schools ADD COLUMN location text;
  END IF;
END $$;

-- 8. UPDATE EXISTING SCHOOLS TO HAVE LOCATION DATA
UPDATE public.schools 
SET location = COALESCE(address, city, 'No location specified')
WHERE location IS NULL OR location = '';

-- 9. GRANT PERMISSIONS
GRANT ALL ON public.student_supervisor_relationships TO authenticated;
GRANT ALL ON public.school_memberships TO authenticated;
GRANT ALL ON public.schools TO authenticated;

-- 10. ADD UNIQUE CONSTRAINT FOR SCHOOL MEMBERSHIPS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'school_memberships_school_id_user_id_key'
  ) THEN
    ALTER TABLE public.school_memberships 
    ADD CONSTRAINT school_memberships_school_id_user_id_key 
    UNIQUE (school_id, user_id);
  END IF;
END $$;

-- 11. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_student 
  ON public.student_supervisor_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_supervisor 
  ON public.student_supervisor_relationships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_user 
  ON public.school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_school 
  ON public.school_memberships(school_id);

-- Done
SELECT 'Setup complete! Supervisor and school relationships are now fully functional.' as status; 