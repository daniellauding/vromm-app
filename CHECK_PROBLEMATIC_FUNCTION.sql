-- CHECK: What does the problematic function do?

-- 1. Check if the function exists and what it does
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_default_preset_for_user'
AND routine_schema = 'public';

-- 2. Check if it exists in other schemas
SELECT 
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_default_preset_for_user';

-- 3. Check what tables it might be trying to access
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%map_presets%'
AND routine_name = 'create_default_preset_for_user';
