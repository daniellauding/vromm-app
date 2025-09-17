-- CHECK: What triggers and functions exist that might be causing the 500 error

-- 1. Check for any triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 2. Check for any functions that might be called during signup
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
    routine_definition ILIKE '%auth.users%' 
    OR routine_definition ILIKE '%handle_new_user%'
    OR routine_definition ILIKE '%create_invited_user%'
    OR routine_definition ILIKE '%profiles%'
);

-- 3. Check for any functions in the auth schema
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'auth'
AND routine_definition ILIKE '%profiles%';

-- 4. Check if there are any system triggers or functions
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as triggername,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users';

-- 5. Check for any functions that might be called by Supabase auth
SELECT 
    proname,
    prosrc
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND prosrc ILIKE '%profiles%';
