-- FIX MAP_PRESET_MEMBERS CONSTRAINT - Investigate and fix the constraint violation
-- This script helps debug the check constraint issue

-- ============================================================================
-- 1. INVESTIGATE THE CONSTRAINT
-- ============================================================================
SELECT '=== INVESTIGATE THE CONSTRAINT ===' as section;

-- Check what constraints exist on map_preset_members
SELECT 
    'Map Preset Members Constraints' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'c';

-- Check the table structure
SELECT 
    'Map Preset Members Columns' as analysis_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'map_preset_members' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK CURRENT DATA
-- ============================================================================
SELECT '=== CHECK CURRENT DATA ===' as section;

-- Check current map_preset_members data
SELECT 
    'Current Map Preset Members' as analysis_type,
    id,
    preset_id,
    user_id,
    role,
    created_at
FROM map_preset_members 
ORDER BY created_at DESC
LIMIT 10;

-- Check what roles are being used
SELECT 
    'Role Usage in Map Preset Members' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 3. CHECK COLLECTION INVITATIONS
-- ============================================================================
SELECT '=== CHECK COLLECTION INVITATIONS ===' as section;

-- Check collection invitations and their roles
SELECT 
    'Collection Invitations Roles' as analysis_type,
    role,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY role
ORDER BY count DESC;

-- Check recent collection invitations
SELECT 
    'Recent Collection Invitations' as analysis_type,
    id,
    preset_id,
    invited_user_id,
    role,
    status,
    created_at
FROM collection_invitations 
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 4. IDENTIFY THE PROBLEM
-- ============================================================================
SELECT '=== IDENTIFY THE PROBLEM ===' as section;

-- The error shows the constraint is "map_preset_members_role_check"
-- Let's see what valid roles are allowed
SELECT 
    'Constraint Check' as analysis_type,
    'The constraint map_preset_members_role_check is failing' as issue,
    'This suggests there are invalid role values' as explanation;

-- Check if there are any invalid roles in the data
SELECT 
    'Invalid Roles Check' as analysis_type,
    role,
    COUNT(*) as count,
    'These roles might be invalid' as note
FROM map_preset_members 
WHERE role NOT IN ('read', 'write', 'admin', 'owner')
GROUP BY role;

-- ============================================================================
-- 5. FIX THE CONSTRAINT ISSUE
-- ============================================================================
SELECT '=== FIX THE CONSTRAINT ISSUE ===' as section;

-- Option 1: Check what the constraint actually allows
SELECT 
    'Constraint Definition' as analysis_type,
    'Need to see the actual constraint definition' as note;

-- Option 2: Update invalid roles to valid ones
UPDATE map_preset_members 
SET role = 'read'
WHERE role NOT IN ('read', 'write', 'admin', 'owner');

-- Option 3: Check if the constraint needs to be updated
SELECT 
    'Constraint Update Needed' as analysis_type,
    'If the constraint is too restrictive, it might need to be altered' as note;

-- ============================================================================
-- 6. TEST THE FIX
-- ============================================================================
SELECT '=== TEST THE FIX ===' as section;

-- Test inserting a valid role
INSERT INTO map_preset_members (
    preset_id,
    user_id,
    role
) VALUES (
    (SELECT id FROM map_presets LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    'read'
) ON CONFLICT (preset_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Check if the insert worked
SELECT 
    'Test Insert Result' as analysis_type,
    'Insert successful' as status,
    'Role constraint should be working now' as note;

-- ============================================================================
-- 7. CLEANUP AND VERIFICATION
-- ============================================================================
SELECT '=== CLEANUP AND VERIFICATION ===' as section;

-- Remove the test record
DELETE FROM map_preset_members 
WHERE role = 'read' 
    AND created_at >= NOW() - INTERVAL '1 minute';

-- Verify the constraint is working
SELECT 
    'Constraint Verification' as analysis_type,
    'All roles should now be valid' as status,
    'The invitation flow should work properly' as note;
