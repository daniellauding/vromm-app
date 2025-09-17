-- CHECK: What does the map_presets table look like?

-- 1. Check if the table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'map_presets' 
AND table_schema = 'public';

-- 3. Check if there are any RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'map_presets' 
AND schemaname = 'public';
