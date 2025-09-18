-- Debug script to check pending invitation deletion issues
-- This script will help identify why DELETE operations are not working

-- 1. Check if the invitation exists in pending_invitations
SELECT 
  'PENDING_INVITATIONS CHECK' as check_type,
  id,
  email,
  role,
  status,
  invited_by,
  created_at
FROM pending_invitations 
WHERE id = 'efa685a3-b352-4f2e-a1d5-23e54feec8d4';

-- 2. Check if there are any RLS policies affecting pending_invitations
SELECT 
  'RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'pending_invitations';

-- 3. Check current user permissions
SELECT 
  'CURRENT_USER' as check_type,
  current_user,
  session_user,
  current_database();

-- 4. Try to delete the invitation manually (this will show any errors)
DELETE FROM pending_invitations 
WHERE id = 'efa685a3-b352-4f2e-a1d5-23e54feec8d4'
RETURNING *;

-- 5. Check if there are any foreign key constraints
SELECT 
  'FOREIGN_KEYS' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'pending_invitations';

-- 6. Check if there are any triggers on pending_invitations
SELECT 
  'TRIGGERS' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'pending_invitations';
