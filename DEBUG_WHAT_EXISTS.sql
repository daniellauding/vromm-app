-- ============================================
-- DEBUG: WHAT ACTUALLY EXISTS?
-- ============================================

-- 1. Check what columns exist in student_supervisor_relationships table
SELECT 
  'student_supervisor_relationships' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what columns exist in pending_invitations table
SELECT 
  'pending_invitations' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check what columns exist in notifications table
SELECT 
  'notifications' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check what functions exist that might be causing trouble
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname ILIKE '%invitation%' OR proname ILIKE '%relationship%'
ORDER BY proname;

-- 5. Check what triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('pending_invitations', 'student_supervisor_relationships');

-- 6. Show current data
SELECT 'pending_invitations' as source, COUNT(*) as count, string_agg(DISTINCT status, ', ') as statuses
FROM pending_invitations
UNION ALL
SELECT 'student_supervisor_relationships' as source, COUNT(*) as count, string_agg(DISTINCT status, ', ') as statuses  
FROM student_supervisor_relationships
UNION ALL
SELECT 'notifications' as source, COUNT(*) as count, string_agg(DISTINCT type::text, ', ') as types
FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation');
