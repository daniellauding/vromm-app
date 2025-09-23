-- PRACTICAL INVITATION TEST - Real-world testing with actual user IDs
-- This script helps you test the complete invitation flow

-- ============================================================================
-- 1. GET REAL USER IDs FOR TESTING
-- ============================================================================
SELECT '=== GET REAL USER IDs FOR TESTING ===' as section;

-- Get some real users to test with
SELECT 
    'Available Users for Testing' as analysis_type,
    id,
    full_name,
    email,
    role,
    created_at
FROM profiles 
WHERE role IN ('student', 'instructor', 'school')
    AND email IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 2. GET REAL PRESET IDs FOR TESTING
-- ============================================================================
SELECT '=== GET REAL PRESET IDs FOR TESTING ===' as section;

-- Get some real presets to test with
SELECT 
    'Available Presets for Testing' as analysis_type,
    id,
    name,
    description,
    creator_id,
    created_at
FROM map_presets 
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================================
-- 3. TEST RELATIONSHIP INVITATION CREATION
-- ============================================================================
SELECT '=== TEST RELATIONSHIP INVITATION CREATION ===' as section;

-- Create a test relationship invitation
-- Replace the UUIDs with real user IDs from step 1
DO $$
DECLARE
    test_inviter_id UUID;
    test_target_email TEXT;
    test_invitation_id UUID;
BEGIN
    -- Get a real user ID (replace with actual ID from step 1)
    SELECT id INTO test_inviter_id FROM profiles WHERE role = 'student' LIMIT 1;
    
    -- Set target email (replace with actual email)
    test_target_email := 'test-target@example.com';
    
    -- Create invitation
    INSERT INTO pending_invitations (
        email,
        role,
        invited_by,
        metadata,
        status
    ) VALUES (
        test_target_email,
        'instructor',
        test_inviter_id,
        '{"relationshipType": "student_invites_supervisor", "inviterRole": "student", "testInvitation": true}',
        'pending'
    ) RETURNING id INTO test_invitation_id;
    
    RAISE NOTICE 'Created test relationship invitation with ID: %', test_invitation_id;
END $$;

-- ============================================================================
-- 4. TEST COLLECTION INVITATION CREATION
-- ============================================================================
SELECT '=== TEST COLLECTION INVITATION CREATION ===' as section;

-- Create a test collection invitation
-- Replace the UUIDs with real IDs from steps 1 and 2
DO $$
DECLARE
    test_preset_id UUID;
    test_inviter_id UUID;
    test_invited_user_id UUID;
    test_collection_invitation_id UUID;
BEGIN
    -- Get real IDs (replace with actual IDs from steps 1 and 2)
    SELECT id INTO test_preset_id FROM map_presets LIMIT 1;
    SELECT id INTO test_inviter_id FROM profiles WHERE role = 'instructor' LIMIT 1;
    SELECT id INTO test_invited_user_id FROM profiles WHERE role = 'student' LIMIT 1;
    
    -- Create collection invitation
    INSERT INTO collection_invitations (
        preset_id,
        invited_user_id,
        invited_by_user_id,
        role,
        status,
        message
    ) VALUES (
        test_preset_id,
        test_invited_user_id,
        test_inviter_id,
        'read',
        'pending',
        'Test collection invitation for debugging'
    ) RETURNING id INTO test_collection_invitation_id;
    
    RAISE NOTICE 'Created test collection invitation with ID: %', test_collection_invitation_id;
END $$;

-- ============================================================================
-- 5. TEST INVITATION ACCEPTANCE
-- ============================================================================
SELECT '=== TEST INVITATION ACCEPTANCE ===' as section;

-- Accept a relationship invitation
DO $$
DECLARE
    test_invitation_id UUID;
    test_acceptor_id UUID;
BEGIN
    -- Get a pending invitation
    SELECT id INTO test_invitation_id FROM pending_invitations WHERE status = 'pending' LIMIT 1;
    
    -- Get a user to accept it
    SELECT id INTO test_acceptor_id FROM profiles WHERE role = 'instructor' LIMIT 1;
    
    IF test_invitation_id IS NOT NULL THEN
        -- Update invitation status
        UPDATE pending_invitations 
        SET 
            status = 'accepted',
            accepted_at = NOW(),
            accepted_by = test_acceptor_id
        WHERE id = test_invitation_id;
        
        -- Create relationship
        INSERT INTO student_supervisor_relationships (
            student_id,
            supervisor_id,
            status
        ) VALUES (
            (SELECT invited_by FROM pending_invitations WHERE id = test_invitation_id),
            test_acceptor_id,
            'active'
        );
        
        RAISE NOTICE 'Accepted relationship invitation with ID: %', test_invitation_id;
    ELSE
        RAISE NOTICE 'No pending invitations found to accept';
    END IF;
END $$;

-- ============================================================================
-- 6. TEST COLLECTION INVITATION ACCEPTANCE
-- ============================================================================
SELECT '=== TEST COLLECTION INVITATION ACCEPTANCE ===' as section;

-- Accept a collection invitation
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
        
        -- Add user to collection members
        INSERT INTO map_preset_members (
            preset_id,
            user_id,
            added_by
        ) VALUES (
            (SELECT preset_id FROM collection_invitations WHERE id = test_collection_invitation_id),
            (SELECT invited_user_id FROM collection_invitations WHERE id = test_collection_invitation_id),
            (SELECT invited_by_user_id FROM collection_invitations WHERE id = test_collection_invitation_id)
        );
        
        RAISE NOTICE 'Accepted collection invitation with ID: %', test_collection_invitation_id;
    ELSE
        RAISE NOTICE 'No pending collection invitations found to accept';
    END IF;
END $$;

-- ============================================================================
-- 7. VERIFY RESULTS
-- ============================================================================
SELECT '=== VERIFY RESULTS ===' as section;

-- Check created invitations
SELECT 
    'Created Relationship Invitations' as analysis_type,
    id,
    email,
    role,
    status,
    created_at
FROM pending_invitations 
WHERE metadata->>'testInvitation' = 'true'
ORDER BY created_at DESC;

-- Check created relationships
SELECT 
    'Created Relationships' as analysis_type,
    id,
    student_id,
    supervisor_id,
    status,
    created_at
FROM student_supervisor_relationships 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check created collection invitations
SELECT 
    'Created Collection Invitations' as analysis_type,
    id,
    preset_id,
    invited_user_id,
    status,
    created_at
FROM collection_invitations 
WHERE message LIKE '%Test collection invitation%'
ORDER BY created_at DESC;

-- Check created collection members
SELECT 
    'Created Collection Members' as analysis_type,
    id,
    preset_id,
    user_id,
    added_at
FROM map_preset_members 
WHERE added_at >= NOW() - INTERVAL '1 hour'
ORDER BY added_at DESC;

-- ============================================================================
-- 8. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up test data
DELETE FROM pending_invitations WHERE metadata->>'testInvitation' = 'true';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';
DELETE FROM student_supervisor_relationships WHERE created_at >= NOW() - INTERVAL '1 hour';
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';

SELECT 'Test data cleaned up' as cleanup_status;
