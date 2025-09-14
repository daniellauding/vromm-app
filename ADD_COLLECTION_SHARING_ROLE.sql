-- Add collection_sharing role to pending_invitations table
-- This allows the pending_invitations table to handle collection sharing invitations

-- First, let's check if the table exists and what the current constraint is
-- Then we'll modify the constraint to include 'collection_sharing'

-- Drop the existing constraint
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;

-- Add the new constraint that includes 'collection_sharing' and 'supervisor'
ALTER TABLE pending_invitations ADD CONSTRAINT pending_invitations_role_check 
CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin', 'collection_sharing'));

-- Update the comment to document the new role
COMMENT ON COLUMN pending_invitations.role IS 
'User role for the invitation. Valid values: student, instructor, teacher, supervisor, admin, collection_sharing';
