-- NUCLEAR OPTION: Platform-wide relationship reset
-- WARNING: This will remove ALL invitation and relationship data
-- Only use if you want to start fresh with relationships

-- Step 1: Backup current data (recommended)
-- CREATE TABLE pending_invitations_backup AS SELECT * FROM pending_invitations;
-- CREATE TABLE supervisor_student_relationships_backup AS SELECT * FROM supervisor_student_relationships;

-- Step 2: Clear all pending invitations
-- TRUNCATE TABLE pending_invitations;

-- Step 3: Clear all supervisor-student relationships
-- DELETE FROM supervisor_student_relationships;

-- Step 4: Reset any relationship-related flags in profiles
-- UPDATE profiles SET 
--   has_supervisor = FALSE,
--   is_supervisor = FALSE
-- WHERE role IN ('student', 'supervisor');

-- Step 5: Clean up any relationship-related notifications
-- DELETE FROM notifications 
-- WHERE type IN ('invitation_received', 'invitation_accepted', 'invitation_rejected', 'relationship_created');

-- Step 6: Add the unique constraint (should work now with empty table)
-- DO $$ 
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.table_constraints 
--     WHERE constraint_name = 'unique_pending_invitation_per_relationship'
--     AND table_name = 'pending_invitations'
--   ) THEN
--     ALTER TABLE pending_invitations 
--     ADD CONSTRAINT unique_pending_invitation_per_relationship 
--     UNIQUE (email, invited_by, status) 
--     DEFERRABLE INITIALLY DEFERRED;
--   END IF;
-- END $$;

-- Step 7: Verify the reset
-- SELECT 
--   'Pending invitations' as table_name,
--   COUNT(*) as count
-- FROM pending_invitations
-- UNION ALL
-- SELECT 
--   'Supervisor-student relationships' as table_name,
--   COUNT(*) as count
-- FROM supervisor_student_relationships
-- UNION ALL
-- SELECT 
--   'Users with supervisors' as table_name,
--   COUNT(*) as count
-- FROM profiles
-- WHERE has_supervisor = TRUE
-- UNION ALL
-- SELECT 
--   'Users who are supervisors' as table_name,
--   COUNT(*) as count
-- FROM profiles
-- WHERE is_supervisor = TRUE;

-- UNCOMMENT THE SECTIONS ABOVE TO EXECUTE THE NUCLEAR RESET
-- This is commented out for safety - uncomment only if you're sure you want to reset everything
