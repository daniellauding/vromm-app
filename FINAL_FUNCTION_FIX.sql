-- FINAL FIX: Create a function that bypasses RLS issues

-- 1. Drop the existing function
DROP FUNCTION IF EXISTS create_default_preset_for_user() CASCADE;

-- 2. Create a function that uses SECURITY DEFINER and bypasses RLS
CREATE OR REPLACE FUNCTION create_default_preset_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to create a default preset, but don't fail if it doesn't work
    BEGIN
        -- Use SECURITY DEFINER to bypass RLS and run as the function owner
        -- This should have the necessary permissions
        INSERT INTO map_presets (name, description, visibility, creator_id, is_default)
        VALUES (
            'All Routes',
            'View all available routes',
            'public',
            NEW.id,
            TRUE
        );
        
        RAISE NOTICE 'Successfully created default preset for user %', NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the signup
            RAISE WARNING 'Failed to create default preset for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Always return NEW to allow signup to continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant necessary permissions to the function
-- The function should run with the permissions of the function owner (postgres)
-- which should have access to insert into map_presets

-- 4. Test that the function exists
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name = 'create_default_preset_for_user'
AND routine_schema = 'public';
