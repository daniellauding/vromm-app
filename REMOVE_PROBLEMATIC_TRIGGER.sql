-- REMOVE THE PROBLEMATIC TRIGGER: This is what's causing the 500 error!

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS create_default_preset_trigger ON auth.users;

-- 2. Drop the function it calls (if it exists)
DROP FUNCTION IF EXISTS create_default_preset_for_user() CASCADE;

-- 3. Check if there are any other similar functions
DROP FUNCTION IF EXISTS public.create_default_preset_for_user() CASCADE;

-- 4. Verify the trigger is gone
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as triggername,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users'
AND t.tgname = 'create_default_preset_trigger';
