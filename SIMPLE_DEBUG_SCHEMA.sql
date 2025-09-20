-- SIMPLE DEBUG - Check what columns actually exist
-- Run this to see the real database structure

-- 1. Check all tables that might be related to invitations
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%invitation%' OR table_name LIKE '%pending%'
ORDER BY table_name;

-- 2. Check all columns in any invitation-related tables
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name LIKE '%invitation%' OR table_name LIKE '%pending%'
ORDER BY table_name, ordinal_position;

-- 3. Check student_supervisor_relationships columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 4. Check if there are any tables with "collection" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%collection%'
ORDER BY table_name;

-- 5. Check if there are any tables with "map" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%map%'
ORDER BY table_name;
