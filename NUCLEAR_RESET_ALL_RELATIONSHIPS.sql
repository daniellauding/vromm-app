-- 🚨 NUCLEAR RESET: DELETE ALL RELATIONSHIPS AND INVITATIONS
-- Copy and paste these commands ONE BY ONE into Supabase SQL console

-- 1. DELETE ALL RELATIONSHIP REVIEWS FIRST
DELETE FROM relationship_reviews;

-- 2. DELETE ALL ACTIVE RELATIONSHIPS 
DELETE FROM student_supervisor_relationships;

-- 3. DELETE ALL PENDING INVITATIONS
DELETE FROM pending_invitations;

-- 4. DELETE ALL RELATIONSHIP-RELATED NOTIFICATIONS
DELETE FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
   OR (type = 'new_message' AND metadata->>'notification_subtype' IN ('relationship_review', 'relationship_removed', 'invitation_accepted'));

-- 5. VERIFICATION - Should all return 0
SELECT 'VERIFICATION - All should be 0:' as check_result;

SELECT 'Active Relationships' as table_name, COUNT(*) as count
FROM student_supervisor_relationships
UNION ALL
SELECT 'Relationship Reviews' as table_name, COUNT(*) as count  
FROM relationship_reviews
UNION ALL
SELECT 'Pending Invitations' as table_name, COUNT(*) as count
FROM pending_invitations
UNION ALL
SELECT 'Relationship Notifications' as table_name, COUNT(*) as count
FROM notifications 
WHERE type IN ('supervisor_invitation', 'student_invitation')
   OR (type = 'new_message' AND metadata->>'notification_subtype' IN ('relationship_review', 'relationship_removed', 'invitation_accepted'));

-- 6. FINAL CONFIRMATION
SELECT 
  'SYSTEM COMPLETELY RESET' as status,
  'daniel+student and daniel+handledare can now invite each other fresh!' as note,
  NOW() as reset_time;
