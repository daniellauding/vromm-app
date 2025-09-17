-- MINIMAL FIX: Remove ALL complex logic and just make signup work
-- This removes any triggers or functions that might be causing the 500 error

-- 1. Drop ALL existing functions that might be interfering
DROP FUNCTION IF EXISTS public.handle_new_user_invitation() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.setup_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_invited_user_with_password(TEXT, TEXT, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_invited_user_with_password(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_invited_user_with_password(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_invited_user_with_password(TEXT, TEXT) CASCADE;

-- 2. Drop ALL triggers on auth.users (if we can)
-- Note: This might fail due to permissions, but we'll try
DO $$
BEGIN
    -- Try to drop any triggers we might have created
    BEGIN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        RAISE NOTICE 'Successfully dropped trigger on auth.users';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Cannot drop trigger on auth.users - insufficient privileges (this is normal)';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping trigger: %', SQLERRM;
    END;
END $$;

-- 3. Create a simple function that can be called AFTER signup (not during)
CREATE OR REPLACE FUNCTION public.create_simple_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Just insert the profile, nothing fancy
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        created_at, 
        updated_at
    ) VALUES (
        user_id,
        user_email,
        COALESCE(user_name, user_email),
        'student',
        NOW(),
        NOW()
    );
    
    RETURN TRUE;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, that's fine
        RETURN TRUE;
    WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE WARNING 'Failed to create profile for user %: %', user_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_simple_profile(UUID, TEXT, TEXT) TO authenticated;

-- 5. Create a simple RPC function
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    current_user_name TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    current_user_email := auth.email();
    
    -- Get name from metadata
    SELECT raw_user_meta_data->>'full_name' INTO current_user_name
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Create profile if it doesn't exist
    RETURN public.create_simple_profile(current_user_id, current_user_email, current_user_name);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to ensure profile exists: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;
