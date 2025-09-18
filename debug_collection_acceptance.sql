-- Debug Collection Acceptance Issue
-- This script will help us understand and fix the collection acceptance problem

-- 1. Check the map_preset_members table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'map_preset_members' 
ORDER BY ordinal_position;

-- 2. Check if the collection IDs from notifications exist in map_presets
SELECT 
    'Collection 1' as source,
    'b4bc33ee-4966-4631-be0f-ea6d7bc58dce' as collection_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM map_presets WHERE id = 'b4bc33ee-4966-4631-be0f-ea6d7bc58dce') 
        THEN 'EXISTS' 
        ELSE 'NOT FOUND' 
    END as status
UNION ALL
SELECT 
    'Collection 2' as source,
    'ba8a8c0e-652a-40d0-9796-b2c9a3aa5225' as collection_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM map_presets WHERE id = 'ba8a8c0e-652a-40d0-9796-b2c9a3aa5225') 
        THEN 'EXISTS' 
        ELSE 'NOT FOUND' 
    END as status;

-- 3. Check what collections actually exist
SELECT 
    id,
    name,
    creator_id,
    created_at
FROM map_presets 
WHERE id IN ('b4bc33ee-4966-4631-be0f-ea6d7bc58dce', 'ba8a8c0e-652a-40d0-9796-b2c9a3aa5225')
ORDER BY created_at DESC;

-- 4. Check RLS policies on map_preset_members
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'map_preset_members';

-- 5. Check if user can insert into map_preset_members
-- (This will be run by the app user)
SELECT 
    'Current user can insert into map_preset_members' as test,
    CASE 
        WHEN has_table_privilege('map_preset_members', 'INSERT') 
        THEN 'YES' 
        ELSE 'NO' 
    END as can_insert;

-- 6. Check recent map_preset_members entries
SELECT 
    id,
    preset_id,
    user_id,
    role,
    added_at,
    added_by
FROM map_preset_members 
ORDER BY added_at DESC 
LIMIT 10;
