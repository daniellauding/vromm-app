-- SIMPLE FIX FOR ACCEPTED_BY CONSTRAINT ISSUE
-- This fixes the constraint without dropping the table (safer approach)

-- 1. Check current constraint status
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';

-- 2. Remove any NOT NULL constraint on accepted_by column
-- This is the key fix - accepted_by should be nullable for pending invitations
ALTER TABLE pending_invitations 
ALTER COLUMN accepted_by DROP NOT NULL;

-- 3. Set default to NULL (should already be the case)
ALTER TABLE pending_invitations 
ALTER COLUMN accepted_by SET DEFAULT NULL;

-- 4. Verify the fix worked
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';

-- 5. Test insertion without accepted_by (this should work now)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    -- If no profiles exist, create a test one
    IF test_user_id IS NULL THEN
        INSERT INTO profiles (id, email, full_name, role) 
        VALUES (gen_random_uuid(), 'test@example.com', 'Test User', 'student')
        RETURNING id INTO test_user_id;
    END IF;
    
    -- Test inserting a pending invitation without accepted_by
    INSERT INTO pending_invitations (
        email, 
        role, 
        invited_by, 
        status
    ) VALUES (
        'test-invitation@example.com',
        'student',
        test_user_id,
        'pending'
    );
    
    RAISE NOTICE 'SUCCESS: Pending invitation created without accepted_by';
    
    -- Clean up test data
    DELETE FROM pending_invitations WHERE email = 'test-invitation@example.com';
    
    -- Clean up test profile if we created one
    DELETE FROM profiles WHERE email = 'test@example.com';
    
END $$;

-- 6. Final verification
SELECT 
    CASE 
        WHEN is_nullable = 'YES' THEN 'SUCCESS: accepted_by is now nullable'
        ELSE 'ERROR: accepted_by is still not nullable'
    END as status
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';
