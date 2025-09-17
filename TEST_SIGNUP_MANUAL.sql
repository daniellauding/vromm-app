-- TEST: Try to manually create a profile to see what fails
-- This will help us understand what's blocking signup

-- First, let's see what happens when we try to create a profile manually
-- (This simulates what the trigger should do)

-- Test 1: Try to create a profile with a dummy user ID
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    -- Try to insert into profiles
    BEGIN
        INSERT INTO public.profiles (id, full_name, email, role)
        VALUES (test_user_id, 'Test User', test_email, 'student');
        
        RAISE NOTICE 'SUCCESS: Profile creation worked';
        
        -- Clean up
        DELETE FROM public.profiles WHERE id = test_user_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profile creation failed: %', SQLERRM;
    END;
END $$;

-- Test 2: Check if we can access auth.users table
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO user_count FROM auth.users;
        RAISE NOTICE 'SUCCESS: Can access auth.users, count: %', user_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Cannot access auth.users: %', SQLERRM;
    END;
END $$;

-- Test 3: Check if the trigger function can be called
DO $$
DECLARE
    result RECORD;
BEGIN
    BEGIN
        -- Try to call the function with dummy data
        SELECT public.handle_new_user_invitation() INTO result;
        RAISE NOTICE 'SUCCESS: Trigger function can be called';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Trigger function failed: %', SQLERRM;
    END;
END $$;
