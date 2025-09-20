-- DEBUG INVITATION ERRORS
-- Run this to see what's actually in the database

-- 1. Check pending_invitations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations'
ORDER BY ordinal_position;

-- 2. Check student_supervisor_relationships table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 3. Check for any tables with preset_id column
SELECT table_name, column_name
FROM information_schema.columns 
WHERE column_name LIKE '%preset%'
ORDER BY table_name, column_name;

-- 4. Check for any tables with map_preset in the name
SELECT table_name
FROM information_schema.tables 
WHERE table_name LIKE '%map%' OR table_name LIKE '%preset%'
ORDER BY table_name;

-- 5. Check current data in pending_invitations
SELECT 
  id,
  email,
  accepted_by,
  invited_by,
  status,
  created_at
FROM pending_invitations 
LIMIT 10;

-- 6. Check current data in student_supervisor_relationships
SELECT 
  id,
  student_id,
  supervisor_id,
  invitation_id,
  created_at
FROM student_supervisor_relationships 
LIMIT 10;
