-- SIMPLE FIX MISSING REFERENCES - Fix the missing foreign key references
-- The error is caused by missing foreign key references, not a role constraint

-- ============================================================================
-- 1. IDENTIFY THE REAL CONSTRAINT
-- ============================================================================
SELECT '=== IDENTIFY THE REAL CONSTRAINT ===' as section;

-- Get the constraint with ID 371062
SELECT 
    'Real Constraint Definition' as analysis_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE oid = 371062;

-- ============================================================================
-- 2. CHECK FOR MISSING PRESET REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING PRESET REFERENCES ===' as section;

-- Check if preset_ids from collection_invitations exist in map_presets
SELECT 
    'Missing Preset References' as analysis_type,
    ci.preset_id,
    CASE 
        WHEN mp.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING - This is the problem!'
    END as status
FROM collection_invitations ci
LEFT JOIN map_presets mp ON ci.preset_id = mp.id
WHERE ci.status = 'pending'
LIMIT 10;

-- ============================================================================
-- 3. CHECK FOR MISSING USER REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING USER REFERENCES ===' as section;

-- Check if user_ids from collection_invitations exist in auth.users
SELECT 
    'Missing User References' as analysis_type,
    ci.invited_user_id,
    CASE 
        WHEN au.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING - This is the problem!'
    END as status
FROM collection_invitations ci
LEFT JOIN auth.users au ON ci.invited_user_id = au.id
WHERE ci.status = 'pending'
LIMIT 10;

-- ============================================================================
-- 4. CHECK FOR MISSING ADDED_BY REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING ADDED_BY REFERENCES ===' as section;

-- Check if added_by users from collection_invitations exist in auth.users
SELECT 
    'Missing Added By References' as analysis_type,
    ci.invited_by_user_id,
    CASE 
        WHEN au.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING - This is the problem!'
    END as status
FROM collection_invitations ci
LEFT JOIN auth.users au ON ci.invited_by_user_id = au.id
WHERE ci.status = 'pending'
LIMIT 10;

-- ============================================================================
-- 5. FIND VALID COLLECTION INVITATIONS
-- ============================================================================
SELECT '=== FIND VALID COLLECTION INVITATIONS ===' as section;

-- Find collection invitations with all valid references
SELECT 
    'Valid Collection Invitations' as analysis_type,
    ci.id,
    ci.preset_id,
    ci.invited_user_id,
    ci.invited_by_user_id,
    'All references exist' as status
FROM collection_invitations ci
WHERE ci.status = 'pending'
    AND EXISTS (SELECT 1 FROM map_presets mp WHERE mp.id = ci.preset_id)
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ci.invited_user_id)
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ci.invited_by_user_id)
LIMIT 5;

-- ============================================================================
-- 6. TEST WITH VALID REFERENCES
-- ============================================================================
SELECT '=== TEST WITH VALID REFERENCES ===' as section;

-- Test the collection invitation acceptance with valid references
DO $$
DECLARE
    test_collection_invitation_id UUID;
    valid_preset_id UUID;
    valid_user_id UUID;
    valid_added_by_id UUID;
BEGIN
    -- Get a pending collection invitation with valid references
    SELECT 
        ci.id,
        ci.preset_id,
        ci.invited_user_id,
        ci.invited_by_user_id
    INTO 
        test_collection_invitation_id,
        valid_preset_id,
        valid_user_id,
        valid_added_by_id
    FROM collection_invitations ci
    WHERE ci.status = 'pending'
        AND EXISTS (SELECT 1 FROM map_presets mp WHERE mp.id = ci.preset_id)
        AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ci.invited_user_id)
        AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ci.invited_by_user_id)
    LIMIT 1;
    
    IF test_collection_invitation_id IS NOT NULL THEN
        -- Update collection invitation status
        UPDATE collection_invitations 
        SET 
            status = 'accepted',
            responded_at = NOW()
        WHERE id = test_collection_invitation_id;
        
        -- Add user to collection members with valid references
        INSERT INTO map_preset_members (
            preset_id,
            user_id,
            added_by,
            role
        ) VALUES (
            valid_preset_id,
            valid_user_id,
            valid_added_by_id,
            'read'
        );
        
        RAISE NOTICE 'Successfully accepted collection invitation with ID: %', test_collection_invitation_id;
    ELSE
        RAISE NOTICE 'No pending collection invitations with valid references found';
    END IF;
END $$;

-- ============================================================================
-- 7. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up any test data we created
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';

SELECT 'Test data cleaned up' as cleanup_status;
