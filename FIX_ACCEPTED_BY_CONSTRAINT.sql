-- FIX ACCEPTED_BY CONSTRAINT ISSUE
-- This fixes the "null value in column 'accepted_by' violates not-null constraint" error

-- 1. Check current constraint on accepted_by column
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';

-- 2. Remove any NOT NULL constraint on accepted_by column
-- (This should be nullable since invitations start as pending)
ALTER TABLE pending_invitations 
ALTER COLUMN accepted_by DROP NOT NULL;

-- 3. Ensure accepted_by can be NULL (should be the default)
ALTER TABLE pending_invitations 
ALTER COLUMN accepted_by SET DEFAULT NULL;

-- 4. Verify the fix
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';

-- 5. Test that we can insert pending invitations without accepted_by
-- (This should work after the fix)
INSERT INTO pending_invitations (
    email, 
    role, 
    invited_by, 
    status
) VALUES (
    'test@example.com',
    'student',
    '00000000-0000-0000-0000-000000000000',
    'pending'
);

-- Clean up test data
DELETE FROM pending_invitations WHERE email = 'test@example.com';
