-- QUICK FIX ROLE CONSTRAINT - Direct fix for the role constraint issue
-- This script fixes the map_preset_members role constraint violation

-- ============================================================================
-- 1. CHECK THE CONSTRAINT
-- ============================================================================
SELECT '=== CHECK THE CONSTRAINT ===' as section;

-- See what the constraint actually is
SELECT 
    'Constraint Definition' as analysis_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'map_preset_members'::regclass
    AND contype = 'c'
    AND conname LIKE '%role%';

-- ============================================================================
-- 2. CHECK CURRENT ROLES
-- ============================================================================
SELECT '=== CHECK CURRENT ROLES ===' as section;

-- Check what roles exist in map_preset_members
SELECT 
    'Current Roles in Map Preset Members' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
GROUP BY role
ORDER BY count DESC;

-- Check what roles exist in collection_invitations
SELECT 
    'Current Roles in Collection Invitations' as analysis_type,
    role,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 3. FIX INVALID ROLES
-- ============================================================================
SELECT '=== FIX INVALID ROLES ===' as section;

-- Update any invalid roles to 'read' (which should be valid)
UPDATE map_preset_members 
SET role = 'read'
WHERE role IS NULL OR role NOT IN ('read', 'write', 'admin', 'owner');

-- Update collection_invitations roles to valid ones
UPDATE collection_invitations 
SET role = 'read'
WHERE role IS NULL OR role NOT IN ('read', 'write', 'admin', 'owner');

-- ============================================================================
-- 4. VERIFY THE FIX
-- ============================================================================
SELECT '=== VERIFY THE FIX ===' as section;

-- Check that all roles are now valid
SELECT 
    'Fixed Roles in Map Preset Members' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
GROUP BY role
ORDER BY count DESC;

-- Check that all collection invitation roles are valid
SELECT 
    'Fixed Roles in Collection Invitations' as analysis_type,
    role,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 5. TEST THE INVITATION FLOW AGAIN
-- ============================================================================
SELECT '=== TEST THE INVITATION FLOW AGAIN ===' as section;

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
-- 6. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up any test data we created
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';

SELECT 'Test data cleaned up' as cleanup_status;
