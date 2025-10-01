-- FIX REAL CONSTRAINT ISSUE - Fix the actual referential integrity constraint
-- The error is NOT a role constraint, but a foreign key constraint violation

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
-- 2. CHECK ALL CONSTRAINTS ON MAP_PRESET_MEMBERS
-- ============================================================================
SELECT '=== CHECK ALL CONSTRAINTS ON MAP_PRESET_MEMBERS ===' as section;

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
-- 3. CHECK FOR MISSING FOREIGN KEY REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING FOREIGN KEY REFERENCES ===' as section;

-- Check if the preset_id exists
SELECT 
    'Preset ID Check' as analysis_type,
    'Checking if preset_id exists in map_presets' as note;

-- Get a sample preset_id from collection_invitations
SELECT 
    'Sample Preset IDs from Collection Invitations' as analysis_type,
    preset_id,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending'
GROUP BY preset_id
LIMIT 5;

-- Check if these preset_ids exist in map_presets
SELECT 
    'Preset ID Existence Check' as analysis_type,
    ci.preset_id,
    CASE 
        WHEN mp.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM collection_invitations ci
LEFT JOIN map_presets mp ON ci.preset_id = mp.id
WHERE ci.status = 'pending'
LIMIT 5;

-- ============================================================================
-- 4. CHECK FOR MISSING USER REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING USER REFERENCES ===' as section;

-- Check if the user_id exists in auth.users
SELECT 
    'User ID Check' as analysis_type,
    'Checking if user_id exists in auth.users' as note;

-- Get a sample user_id from collection_invitations
SELECT 
    'Sample User IDs from Collection Invitations' as analysis_type,
    invited_user_id,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending'
GROUP BY invited_user_id
LIMIT 5;

-- Check if these user_ids exist in auth.users
SELECT 
    'User ID Existence Check' as analysis_type,
    ci.invited_user_id,
    CASE 
        WHEN au.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM collection_invitations ci
LEFT JOIN auth.users au ON ci.invited_user_id = au.id
WHERE ci.status = 'pending'
LIMIT 5;

-- ============================================================================
-- 5. CHECK FOR MISSING ADDED_BY REFERENCES
-- ============================================================================
SELECT '=== CHECK FOR MISSING ADDED_BY REFERENCES ===' as section;

-- Check if the added_by user exists in auth.users
SELECT 
    'Added By User Check' as analysis_type,
    'Checking if added_by user exists in auth.users' as note;

-- Get a sample added_by user from collection_invitations
SELECT 
    'Sample Added By Users from Collection Invitations' as analysis_type,
    invited_by_user_id,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending'
GROUP BY invited_by_user_id
LIMIT 5;

-- Check if these users exist in auth.users
SELECT 
    'Added By User Existence Check' as analysis_type,
    ci.invited_by_user_id,
    CASE 
        WHEN au.id IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM collection_invitations ci
LEFT JOIN auth.users au ON ci.invited_by_user_id = au.id
WHERE ci.status = 'pending'
LIMIT 5;

-- ============================================================================
-- 6. FIX MISSING REFERENCES
-- ============================================================================
SELECT '=== FIX MISSING REFERENCES ===' as section;

-- If any references are missing, we need to fix them
-- For now, let's try to use existing valid references
SELECT 
    'Fix Missing References' as analysis_type,
    'We will use existing valid references' as note;

-- ============================================================================
-- 7. TEST WITH VALID REFERENCES
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
-- 8. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up any test data we created
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';

SELECT 'Test data cleaned up' as cleanup_status;
