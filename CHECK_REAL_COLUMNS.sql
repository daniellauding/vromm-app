-- CHECK REAL COLUMNS - Find out what actually exists
-- Run this to see the exact column names

-- 1. Check student_supervisor_relationships columns
SELECT 'student_supervisor_relationships columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 2. Check pending_invitations columns
SELECT 'pending_invitations columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations'
ORDER BY ordinal_position;

-- 3. Check map_preset_members columns
SELECT 'map_preset_members columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'map_preset_members'
ORDER BY ordinal_position;

-- 4. Check if there are any tables with "invitation" in the name
SELECT 'tables with invitation:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%invitation%'
ORDER BY table_name;

-- 5. Check if there are any tables with "student" in the name
SELECT 'tables with student:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%student%'
ORDER BY table_name;
