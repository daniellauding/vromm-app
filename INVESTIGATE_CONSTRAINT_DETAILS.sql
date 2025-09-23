-- INVESTIGATE CONSTRAINT DETAILS - Find the exact constraint definition
-- This script investigates the exact constraint that's failing

-- ============================================================================
-- 1. FIND THE EXACT CONSTRAINT
-- ============================================================================
SELECT '=== FIND THE EXACT CONSTRAINT ===' as section;

-- Get the exact constraint definition
SELECT 
    'Exact Constraint Definition' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'c'
    AND conname LIKE '%role%';

-- ============================================================================
-- 2. CHECK ALL CONSTRAINTS ON THE TABLE
-- ============================================================================
SELECT '=== CHECK ALL CONSTRAINTS ON THE TABLE ===' as section;

-- Get ALL constraints on map_preset_members
SELECT 
    'All Constraints on Map Preset Members' as analysis_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- 3. CHECK THE TABLE STRUCTURE
-- ============================================================================
SELECT '=== CHECK THE TABLE STRUCTURE ===' as section;

-- Get the complete table structure
SELECT 
    'Map Preset Members Table Structure' as analysis_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'map_preset_members' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. CHECK WHAT ROLES ARE ACTUALLY ALLOWED
-- ============================================================================
SELECT '=== CHECK WHAT ROLES ARE ACTUALLY ALLOWED ===' as section;

-- Check if there's an enum type for roles
SELECT 
    'Role Enum Types' as analysis_type,
    t.typname as type_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname LIKE '%role%'
ORDER BY t.typname, e.enumsortorder;

-- ============================================================================
-- 5. TEST DIFFERENT ROLE VALUES
-- ============================================================================
SELECT '=== TEST DIFFERENT ROLE VALUES ===' as section;

-- Test what happens with different role values
SELECT 
    'Role Value Test' as analysis_type,
    'Testing different role values to see which ones work' as note;

-- Try to find valid role values by checking existing data
SELECT 
    'Existing Valid Roles' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 6. CHECK IF THERE'S A TRIGGER OR FUNCTION
-- ============================================================================
SELECT '=== CHECK IF THERE IS A TRIGGER OR FUNCTION ===' as section;

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
-- 7. CHECK THE EXACT ERROR CONTEXT
-- ============================================================================
SELECT '=== CHECK THE EXACT ERROR CONTEXT ===' as section;

-- The error shows the failing row has these values:
-- (03aa123f-9181-4b19-a0cb-527d67f2805f, 8b6b6edf-c5e5-4166-b27f-185259da4c4f, 435eec12-d6c3-4a1f-97fb-d13656b4fa5d, null, 2025-09-21 18:04:27.072809+00, read, null, 2025-09-21 18:04:27.072809+00, 2025-09-21 18:04:27.072809+00, 2025-09-21 18:04:27.072809+00)

-- Let's check what these IDs represent
SELECT 
    'Failing Row Analysis' as analysis_type,
    'ID: 03aa123f-9181-4b19-a0cb-527d67f2805f' as id,
    'Preset ID: 8b6b6edf-c5e5-4166-b27f-185259da4c4f' as preset_id,
    'User ID: 435eec12-d6c3-4a1f-97fb-d13656b4fa5d' as user_id,
    'Role: read' as role,
    'This row is failing the constraint' as note;

-- ============================================================================
-- 8. CHECK IF THE CONSTRAINT IS ON A DIFFERENT COLUMN
-- ============================================================================
SELECT '=== CHECK IF THE CONSTRAINT IS ON A DIFFERENT COLUMN ===' as section;

-- The constraint might not be on the role column at all!
-- Let's check if there are any other constraints that might be failing
SELECT 
    'All Check Constraints' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'c';

-- ============================================================================
-- 9. CHECK IF THERE'S A UNIQUE CONSTRAINT ISSUE
-- ============================================================================
SELECT '=== CHECK IF THERE IS A UNIQUE CONSTRAINT ISSUE ===' as section;

-- Check for unique constraints
SELECT 
    'Unique Constraints' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'u';

-- ============================================================================
-- 10. CHECK IF THERE'S A FOREIGN KEY ISSUE
-- ============================================================================
SELECT '=== CHECK IF THERE IS A FOREIGN KEY ISSUE ===' as section;

-- Check for foreign key constraints
SELECT 
    'Foreign Key Constraints' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'f';
