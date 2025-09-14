-- Fix pending_invitations role constraint to include all valid roles
-- This will resolve the "invalid input value for enum user_role" error

-- First, let's see what the current constraint is
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'pending_invitations'::regclass AND contype = 'c';

-- Drop the existing constraint (it might have a different name)
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_check;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check1;

-- Add the new constraint that includes all valid roles
ALTER TABLE pending_invitations ADD CONSTRAINT pending_invitations_role_check 
CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin', 'collection_sharing'));

-- Verify the constraint was added
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'pending_invitations'::regclass AND contype = 'c';
