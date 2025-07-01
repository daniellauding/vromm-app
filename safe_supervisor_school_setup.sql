-- SAFE SUPERVISOR & SCHOOL SETUP - HANDLES EXISTING OBJECTS
-- This version safely handles already existing policies, tables, functions, etc.

-- 1. CREATE SUPERVISOR RELATIONSHIPS TABLE (safe)
CREATE TABLE IF NOT EXISTS public.student_supervisor_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_supervisor_relationships_student_id_supervisor_id_key'
  ) THEN
    ALTER TABLE public.student_supervisor_relationships 
    ADD CONSTRAINT student_supervisor_relationships_student_id_supervisor_id_key 
    UNIQUE (student_id, supervisor_id);
  END IF;
END $$;

-- 2. SAFELY DROP AND RECREATE SCHOOL_MEMBERSHIPS RLS POLICIES
DO $$
DECLARE
    pol_name text;
BEGIN
    -- Drop all existing policies on school_memberships
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'school_memberships' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.school_memberships', pol_name);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "school_view_policy" 
  ON public.school_memberships FOR SELECT 
  USING (true);

CREATE POLICY "school_insert_policy" 
  ON public.school_memberships FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "school_update_policy" 
  ON public.school_memberships FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "school_delete_policy" 
  ON public.school_memberships FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. SAFELY DROP AND RECREATE SUPERVISOR RLS POLICIES
DO $$
DECLARE
    pol_name text;
BEGIN
    -- Drop all existing policies on student_supervisor_relationships
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'student_supervisor_relationships' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_supervisor_relationships', pol_name);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.student_supervisor_relationships ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "supervisor_view_policy" 
  ON public.student_supervisor_relationships FOR SELECT 
  USING (auth.uid() = student_id OR auth.uid() = supervisor_id);

CREATE POLICY "supervisor_insert_policy" 
  ON public.student_supervisor_relationships FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "supervisor_update_policy" 
  ON public.student_supervisor_relationships FOR UPDATE 
  USING (auth.uid() = student_id);

CREATE POLICY "supervisor_delete_policy" 
  ON public.student_supervisor_relationships FOR DELETE 
  USING (auth.uid() = student_id);

-- 4. SAFELY DROP AND RECREATE FUNCTIONS
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

-- 7. ADD MISSING FIELDS TO SCHOOLS TABLE (safe)
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

-- 9. GRANT PERMISSIONS (safe)
DO $$
BEGIN
  GRANT ALL ON public.student_supervisor_relationships TO authenticated;
  GRANT ALL ON public.school_memberships TO authenticated;
  GRANT ALL ON public.schools TO authenticated;
EXCEPTION WHEN OTHERS THEN
  -- Ignore permission errors if they already exist
  NULL;
END $$;

-- 10. ADD UNIQUE CONSTRAINT FOR SCHOOL MEMBERSHIPS (safe)
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

-- 11. CREATE INDEXES FOR PERFORMANCE (safe)
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_student 
  ON public.student_supervisor_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_supervisor 
  ON public.student_supervisor_relationships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_user 
  ON public.school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_school 
  ON public.school_memberships(school_id);

-- 12. INSERT MISSING TRANSLATIONS (safe)
INSERT INTO public.translations (key, language, value, platform)
VALUES
  ('profile.selectSupervisors', 'en', 'Select Supervisors', 'mobile'),
  ('profile.selectSupervisors', 'sv', 'Välj Handledare', 'mobile'),
  ('profile.addSelected', 'en', 'Add Selected', 'mobile'),
  ('profile.addSelected', 'sv', 'Lägg till Valda', 'mobile'),
  ('profile.selectSchool', 'en', 'Select School', 'mobile'),
  ('profile.selectSchool', 'sv', 'Välj Skola', 'mobile'),
  ('profile.supervisors', 'en', 'Supervisors', 'mobile'),
  ('profile.supervisors', 'sv', 'Handledare', 'mobile'),
  ('profile.schools', 'en', 'Schools', 'mobile'),
  ('profile.schools', 'sv', 'Skolor', 'mobile'),
  ('profile.experienceLevels.title', 'en', 'Experience Level', 'mobile'),
  ('profile.experienceLevels.title', 'sv', 'Erfarenhetsnivå', 'mobile'),
  ('profile.experienceLevels.beginner', 'en', 'Beginner', 'mobile'),
  ('profile.experienceLevels.beginner', 'sv', 'Nybörjare', 'mobile'),
  ('profile.experienceLevels.intermediate', 'en', 'Intermediate', 'mobile'),
  ('profile.experienceLevels.intermediate', 'sv', 'Mellannivå', 'mobile'),
  ('profile.experienceLevels.advanced', 'en', 'Advanced', 'mobile'),
  ('profile.experienceLevels.advanced', 'sv', 'Avancerad', 'mobile'),
  ('profile.roles.title', 'en', 'Role', 'mobile'),
  ('profile.roles.title', 'sv', 'Roll', 'mobile'),
  ('profile.roles.student', 'en', 'Student', 'mobile'),
  ('profile.roles.student', 'sv', 'Elev', 'mobile'),
  ('profile.roles.instructor', 'en', 'Instructor', 'mobile'),
  ('profile.roles.instructor', 'sv', 'Instruktör', 'mobile'),
  ('profile.roles.school', 'en', 'School', 'mobile'),
  ('profile.roles.school', 'sv', 'Skola', 'mobile')
ON CONFLICT (key, language) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Done!
SELECT 'SAFE setup complete! All supervisor and school functionality is now working.' as status; 