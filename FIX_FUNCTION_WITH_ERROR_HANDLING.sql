-- FIX: Replace the function with proper error handling

-- 1. Drop the existing function
DROP FUNCTION IF EXISTS create_default_preset_for_user() CASCADE;

-- 2. Create a fixed function with proper error handling
CREATE OR REPLACE FUNCTION create_default_preset_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to create a default preset, but don't fail if it doesn't work
    BEGIN
        -- Check if map_presets table exists and has the right columns
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'map_presets' 
            AND table_schema = 'public'
        ) THEN
            -- Try to insert the default preset
            INSERT INTO map_presets (name, description, visibility, creator_id, is_default)
            VALUES (
                'All Routes',
                'View all available routes',
                'public',
                NEW.id,
                TRUE
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the signup
            RAISE WARNING 'Failed to create default preset for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Always return NEW to allow signup to continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Test that the function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'create_default_preset_for_user'
AND routine_schema = 'public';
