-- COMPLETE RESET: Remove all invitations and relationships
-- Run this in Supabase SQL Editor to start fresh

-- 1. Remove all pending invitations
DELETE FROM pending_invitations;

-- 2. Remove all student-supervisor relationships
DELETE FROM student_supervisor_relationships;

-- 3. Remove all school memberships (optional - uncomment if needed)
-- DELETE FROM school_memberships;

-- 4. Remove all relationship-related notifications
DELETE FROM notifications 
WHERE type IN (
  'supervisor_invitation',
  'student_invitation'
);

-- 5. Reset any invitation-related user data (optional)
-- UPDATE profiles SET 
--   follower_count = 0,
--   following_count = 0
-- WHERE true;

-- 6. Verify cleanup
SELECT 'pending_invitations' as table_name, COUNT(*) as remaining_count FROM pending_invitations
UNION ALL
SELECT 'student_supervisor_relationships' as table_name, COUNT(*) as remaining_count FROM student_supervisor_relationships
UNION ALL
SELECT 'invitation_notifications' as table_name, COUNT(*) as remaining_count FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
UNION ALL
SELECT 'school_memberships' as table_name, COUNT(*) as remaining_count FROM school_memberships;

-- 7. Show current users for reference
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles 
WHERE email LIKE '%daniel%'
ORDER BY created_at DESC;
