-- Create placeholder supervisor functions
-- Migration: 20250813_create_supervisor_functions.sql

-- Create basic supervisor relationships table
CREATE TABLE IF NOT EXISTS supervisor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supervisor_id, student_id)
);

-- Create get_user_supervisor_details function
CREATE OR REPLACE FUNCTION get_user_supervisor_details(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT
) AS $$
BEGIN
  -- For now, return empty result set
  -- In production, this would join with profiles and supervisor_relationships
  RETURN QUERY
  SELECT 
    sr.supervisor_id as id,
    'Supervisor'::TEXT as full_name,
    'supervisor@example.com'::TEXT as email,
    'supervisor'::TEXT as role
  FROM supervisor_relationships sr
  WHERE sr.student_id = target_user_id
  AND sr.status = 'active'
  LIMIT 0; -- Return empty result for now
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create basic school_memberships table 
CREATE TABLE IF NOT EXISTS school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  school_id UUID NOT NULL,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

-- Create basic schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);