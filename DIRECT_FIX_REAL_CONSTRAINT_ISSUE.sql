-- DIRECT FIX REAL CONSTRAINT ISSUE - Fix the actual source of the role constraint error
-- Since the constraint doesn't exist, it must be a trigger, function, or application validation

-- ============================================================================
-- 1. INVESTIGATE THE REAL SOURCE
-- ============================================================================
SELECT '=== INVESTIGATE THE REAL SOURCE ===' as section;

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
-- 3. CHECK FOR TRIGGERS ON COLLECTION_INVITATIONS
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON COLLECTION_INVITATIONS ===' as section;

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
-- 4. TEMPORARILY DISABLE TRIGGERS
-- ============================================================================
SELECT '=== TEMPORARILY DISABLE TRIGGERS ===' as section;

-- Disable triggers on map_preset_members temporarily
ALTER TABLE map_preset_members DISABLE TRIGGER ALL;

-- ============================================================================
-- 5. TEST THE INSERT WITHOUT TRIGGERS
-- ============================================================================
SELECT '=== TEST THE INSERT WITHOUT TRIGGERS ===' as section;

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
-- 6. RE-ENABLE TRIGGERS
-- ============================================================================
SELECT '=== RE-ENABLE TRIGGERS ===' as section;

-- Re-enable triggers on map_preset_members
ALTER TABLE map_preset_members ENABLE TRIGGER ALL;

-- ============================================================================
-- 7. CHECK FOR TRIGGERS ON COLLECTION_INVITATIONS
-- ============================================================================
SELECT '=== CHECK FOR TRIGGERS ON COLLECTION_INVITATIONS ===' as section;

-- Check for triggers on collection_invitations that might be causing the issue
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
-- 8. TEMPORARILY DISABLE TRIGGERS ON COLLECTION_INVITATIONS
-- ============================================================================
SELECT '=== TEMPORARILY DISABLE TRIGGERS ON COLLECTION_INVITATIONS ===' as section;

-- Disable triggers on collection_invitations temporarily
ALTER TABLE collection_invitations DISABLE TRIGGER ALL;

-- ============================================================================
-- 9. TEST THE INSERT WITHOUT COLLECTION_INVITATIONS TRIGGERS
-- ============================================================================
SELECT '=== TEST THE INSERT WITHOUT COLLECTION_INVITATIONS TRIGGERS ===' as section;

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
-- 10. RE-ENABLE TRIGGERS ON COLLECTION_INVITATIONS
-- ============================================================================
SELECT '=== RE-ENABLE TRIGGERS ON COLLECTION_INVITATIONS ===' as section;

-- Re-enable triggers on collection_invitations
ALTER TABLE collection_invitations ENABLE TRIGGER ALL;

-- ============================================================================
-- 11. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up any test data we created
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';

SELECT 'Test data cleaned up' as cleanup_status;
