-- Comprehensive fix for pending_invitations role constraint
-- This will handle any existing constraint and ensure all valid roles are allowed

-- First, let's see what constraints currently exist
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'pending_invitations'::regclass AND contype = 'c';

-- Drop ALL possible constraint names that might exist
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_check;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check1;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check2;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_check1;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_check2;

-- Also try to drop any constraint that might be named differently
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any check constraint on the role column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'pending_invitations'::regclass 
        AND contype = 'c'
        AND consrc LIKE '%role%'
    LOOP
        EXECUTE 'ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Now add the new constraint with all valid roles
ALTER TABLE pending_invitations ADD CONSTRAINT pending_invitations_role_check 
CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin', 'collection_sharing'));

-- Verify the constraint was added correctly
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'pending_invitations'::regclass AND contype = 'c';

-- Test that all roles are now accepted
-- INSERT INTO pending_invitations (email, role, invited_by) VALUES ('test@example.com', 'supervisor', '00000000-0000-0000-0000-000000000000');
-- INSERT INTO pending_invitations (email, role, invited_by) VALUES ('test2@example.com', 'collection_sharing', '00000000-0000-0000-0000-000000000000');
-- DELETE FROM pending_invitations WHERE email IN ('test@example.com', 'test2@example.com');
