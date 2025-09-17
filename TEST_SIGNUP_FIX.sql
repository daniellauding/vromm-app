-- TEST: Verify our signup fix works
-- This tests the functions we created

-- Test 1: Test the setup_new_user function
-- (This would normally be called by the client after signup)
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
    test_name TEXT := 'Test User';
    result JSON;
BEGIN
    -- Simulate what the client would do
    -- First, we need to set the auth context (this is normally done by Supabase)
    -- For testing, we'll call the function directly
    
    -- Test the create_user_profile function directly
    SELECT public.create_user_profile(test_user_id, test_email, test_name) INTO result;
    
    RAISE NOTICE 'Profile creation result: %', result;
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
        RAISE NOTICE 'SUCCESS: Profile was created in database';
    ELSE
        RAISE NOTICE 'ERROR: Profile was not created in database';
    END IF;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Test failed: %', SQLERRM;
END $$;

-- Test 2: Check if the functions exist and have correct permissions
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('create_user_profile', 'setup_new_user')
AND routine_schema = 'public';

-- Test 3: Check if we can call the functions (without actually creating data)
DO $$
DECLARE
    result JSON;
BEGIN
    -- This should fail gracefully since we're not authenticated
    BEGIN
        SELECT public.setup_new_user() INTO result;
        RAISE NOTICE 'setup_new_user result: %', result;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'setup_new_user error (expected): %', SQLERRM;
    END;
END $$;
