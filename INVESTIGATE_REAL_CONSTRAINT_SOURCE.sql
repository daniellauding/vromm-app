-- INVESTIGATE REAL CONSTRAINT SOURCE - Find the actual source of the role constraint error
-- The constraint doesn't exist, so it must be a trigger, function, or application validation

-- ============================================================================
-- 1. CHECK FOR TRIGGERS ON MAP_PRESET_MEMBERS
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON MAP_PRESET_MEMBERS ===' as section;

-- Check for triggers on map_preset_members
SELECT 
    'Triggers on Map Preset Members' as analysis_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'map_preset_members'
    AND event_object_schema = 'public';

-- ============================================================================
-- 2. CHECK FOR FUNCTIONS THAT MIGHT VALIDATE ROLES
-- ============================================================================
SELECT '=== CHECK FOR FUNCTIONS THAT MIGHT VALIDATE ROLES ===' as section;

-- Check for functions that might be validating roles
SELECT 
    'Functions with Role Validation' as analysis_type,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%role%'
ORDER BY routine_name;

-- ============================================================================
-- 3. CHECK FOR ALL CONSTRAINTS ON MAP_PRESET_MEMBERS
-- ============================================================================
SELECT '=== CHECK FOR ALL CONSTRAINTS ON MAP_PRESET_MEMBERS ===' as section;

-- Get ALL constraints on map_preset_members (including check constraints)
SELECT 
    'All Constraints on Map Preset Members' as analysis_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- 4. CHECK FOR TRIGGERS ON RELATED TABLES
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON RELATED TABLES ===' as section;

-- Check for triggers on collection_invitations (which might affect map_preset_members)
SELECT 
    'Triggers on Collection Invitations' as analysis_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'collection_invitations'
    AND event_object_schema = 'public';

-- ============================================================================
-- 5. CHECK FOR FUNCTIONS THAT MIGHT BE CALLED BY TRIGGERS
-- ============================================================================
SELECT '=== CHECK FOR FUNCTIONS THAT MIGHT BE CALLED BY TRIGGERS ===' as section;

-- Check for functions that might be called by triggers
SELECT 
    'Functions That Might Be Called by Triggers' as analysis_type,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%map_preset_members%'
ORDER BY routine_name;

-- ============================================================================
-- 6. CHECK FOR ROW LEVEL SECURITY POLICIES
-- ============================================================================
SELECT '=== CHECK FOR ROW LEVEL SECURITY POLICIES ===' as section;

-- Check for RLS policies on map_preset_members
SELECT 
    'RLS Policies on Map Preset Members' as analysis_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'map_preset_members'
    AND schemaname = 'public';

-- ============================================================================
-- 7. CHECK FOR FUNCTIONS THAT MIGHT VALIDATE ROLES
-- ============================================================================
SELECT '=== CHECK FOR FUNCTIONS THAT MIGHT VALIDATE ROLES ===' as section;

-- Check for functions that might be validating roles
SELECT 
    'Functions with Role Validation' as analysis_type,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%role%'
    AND routine_definition ILIKE '%check%'
ORDER BY routine_name;

-- ============================================================================
-- 8. CHECK FOR TRIGGERS ON AUTH.USERS
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON AUTH.USERS ===' as section;

-- Check for triggers on auth.users (since map_preset_members references it)
SELECT 
    'Triggers on Auth Users' as analysis_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
    AND event_object_schema = 'auth';

-- ============================================================================
-- 9. CHECK FOR FUNCTIONS THAT MIGHT BE VALIDATING ROLES
-- ============================================================================
SELECT '=== CHECK FOR FUNCTIONS THAT MIGHT BE VALIDATING ROLES ===' as section;

-- Check for functions that might be validating roles
SELECT 
    'Functions with Role Validation' as analysis_type,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%role%'
    AND routine_definition ILIKE '%IN%'
ORDER BY routine_name;

-- ============================================================================
-- 10. CHECK FOR TRIGGERS ON MAP_PRESETS
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON MAP_PRESETS ===' as section;

-- Check for triggers on map_presets (since map_preset_members references it)
SELECT 
    'Triggers on Map Presets' as analysis_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'map_presets'
    AND event_object_schema = 'public';
