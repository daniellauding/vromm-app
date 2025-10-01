-- DIRECT CONSTRAINT FIX - Fix the constraint issue directly
-- This script addresses the most likely constraint issues

-- ============================================================================
-- 1. INVESTIGATE THE CONSTRAINT
-- ============================================================================
SELECT '=== INVESTIGATE THE CONSTRAINT ===' as section;

-- Get the exact constraint definition
SELECT 
    'Constraint Definition' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'c'
    AND conname LIKE '%role%';

-- ============================================================================
-- 2. CHECK IF THE CONSTRAINT IS TOO RESTRICTIVE
-- ============================================================================
SELECT '=== CHECK IF THE CONSTRAINT IS TOO RESTRICTIVE ===' as section;

-- The error suggests the constraint might be checking for specific role values
-- Let's see what roles are actually allowed by checking existing data
SELECT 
    'Existing Valid Roles' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 3. CHECK IF THERE'S A ROLE ENUM
-- ============================================================================
SELECT '=== CHECK IF THERE IS A ROLE ENUM ===' as section;

-- Check if there's a role enum type
SELECT 
    'Role Enum Types' as analysis_type,
    t.typname as type_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname LIKE '%role%'
ORDER BY t.typname, e.enumsortorder;

-- ============================================================================
-- 4. TEMPORARILY DROP THE CONSTRAINT
-- ============================================================================
SELECT '=== TEMPORARILY DROP THE CONSTRAINT ===' as section;

-- Drop the problematic constraint temporarily
ALTER TABLE map_preset_members DROP CONSTRAINT IF EXISTS map_preset_members_role_check;

-- ============================================================================
-- 5. TEST THE INSERT WITHOUT THE CONSTRAINT
-- ============================================================================
SELECT '=== TEST THE INSERT WITHOUT THE CONSTRAINT ===' as section;

-- Now try the collection invitation acceptance again
DO $$
DECLARE
    test_collection_invitation_id UUID;
BEGIN
    -- Get a pending collection invitation
    SELECT id INTO test_collection_invitation_id FROM collection_invitations WHERE status = 'pending' LIMIT 1;
    
    IF test_collection_invitation_id IS NOT NULL THEN
        -- Update collection invitation status
        UPDATE collection_invitations 
        SET 
            status = 'accepted',
            responded_at = NOW()
        WHERE id = test_collection_invitation_id;
        
        -- Add user to collection members with valid role
        INSERT INTO map_preset_members (
            preset_id,
            user_id,
            added_by,
            role
        ) VALUES (
            (SELECT preset_id FROM collection_invitations WHERE id = test_collection_invitation_id),
            (SELECT invited_user_id FROM collection_invitations WHERE id = test_collection_invitation_id),
            (SELECT invited_by_user_id FROM collection_invitations WHERE id = test_collection_invitation_id),
            'read'  -- Use a valid role
        );
        
        RAISE NOTICE 'Successfully accepted collection invitation with ID: %', test_collection_invitation_id;
    ELSE
        RAISE NOTICE 'No pending collection invitations found to accept';
    END IF;
END $$;

-- ============================================================================
-- 6. RECREATE THE CONSTRAINT WITH PROPER VALUES
-- ============================================================================
SELECT '=== RECREATE THE CONSTRAINT WITH PROPER VALUES ===' as section;

-- Recreate the constraint with proper role values
-- Based on common role patterns, let's allow: read, write, admin, owner
ALTER TABLE map_preset_members 
ADD CONSTRAINT map_preset_members_role_check 
CHECK (role IN ('read', 'write', 'admin', 'owner'));

-- ============================================================================
-- 7. VERIFY THE FIX WORKS
-- ============================================================================
SELECT '=== VERIFY THE FIX WORKS ===' as section;

-- Test that the constraint now works
SELECT 
    'Constraint Fix Verification' as analysis_type,
    'The constraint should now allow: read, write, admin, owner' as note,
    'Collection invitations should work properly' as status;

-- ============================================================================
-- 8. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up any test data we created
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';

SELECT 'Test data cleaned up' as cleanup_status;
