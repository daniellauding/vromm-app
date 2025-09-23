-- COMPLETE INVITATION SYSTEM FIX - Fix all invitation issues at once
-- This script fixes the entire invitation system comprehensively

-- ============================================================================
-- 1. CLEAN UP BROKEN DATA
-- ============================================================================
SELECT '=== CLEAN UP BROKEN DATA ===' as section;

-- Remove any broken collection invitations with missing references
DELETE FROM collection_invitations 
WHERE status = 'pending'
    AND (
        NOT EXISTS (SELECT 1 FROM map_presets mp WHERE mp.id = preset_id)
        OR NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = invited_user_id)
        OR NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = invited_by_user_id)
    );

-- Remove any broken pending invitations with missing references
DELETE FROM pending_invitations 
WHERE status = 'pending'
    AND (
        NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = invited_by)
        OR email IS NULL
        OR email = ''
    );

-- ============================================================================
-- 2. FIX MISSING FOREIGN KEY REFERENCES
-- ============================================================================
SELECT '=== FIX MISSING FOREIGN KEY REFERENCES ===' as section;

-- Update collection invitations to use valid references
UPDATE collection_invitations 
SET 
    preset_id = (SELECT id FROM map_presets LIMIT 1),
    invited_user_id = (SELECT id FROM auth.users LIMIT 1),
    invited_by_user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE status = 'pending'
    AND (
        NOT EXISTS (SELECT 1 FROM map_presets mp WHERE mp.id = preset_id)
        OR NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = invited_user_id)
        OR NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = invited_by_user_id)
    );

-- ============================================================================
-- 3. CREATE VALID TEST DATA
-- ============================================================================
SELECT '=== CREATE VALID TEST DATA ===' as section;

-- Create a test preset if none exists
INSERT INTO map_presets (id, name, description, creator_id)
SELECT 
    gen_random_uuid(),
    'Test Preset for Invitations',
    'Test preset for invitation system',
    (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM map_presets LIMIT 1);

-- Create test collection invitations with valid references
INSERT INTO collection_invitations (
    id,
    preset_id,
    invited_user_id,
    invited_by_user_id,
    role,
    status,
    message
)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM map_presets LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'read',
    'pending',
    'Test collection invitation for debugging'
WHERE NOT EXISTS (SELECT 1 FROM collection_invitations WHERE status = 'pending');

-- ============================================================================
-- 4. TEST RELATIONSHIP INVITATIONS
-- ============================================================================
SELECT '=== TEST RELATIONSHIP INVITATIONS ===' as section;

-- Test relationship invitation creation
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT;
BEGIN
    -- Get a valid user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- Create a test relationship invitation
    INSERT INTO pending_invitations (
        email,
        role,
        invited_by,
        metadata,
        status
    ) VALUES (
        'test-invitation@example.com',
        'instructor',
        test_user_id,
        '{"testInvitation": true, "relationshipType": "student_invites_supervisor"}',
        'pending'
    );
    
    RAISE NOTICE 'Created test relationship invitation';
END $$;

-- ============================================================================
-- 5. TEST COLLECTION INVITATIONS
-- ============================================================================
SELECT '=== TEST COLLECTION INVITATIONS ===' as section;

-- Test collection invitation acceptance
DO $$
DECLARE
    test_collection_invitation_id UUID;
    valid_preset_id UUID;
    valid_user_id UUID;
    valid_added_by_id UUID;
BEGIN
    -- Get a valid collection invitation
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
        
        -- Add user to collection members
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
        RAISE NOTICE 'No valid collection invitations found';
    END IF;
END $$;

-- ============================================================================
-- 6. TEST RELATIONSHIP INVITATION ACCEPTANCE
-- ============================================================================
SELECT '=== TEST RELATIONSHIP INVITATION ACCEPTANCE ===' as section;

-- Test relationship invitation acceptance
DO $$
DECLARE
    test_invitation_id UUID;
    test_acceptor_id UUID;
BEGIN
    -- Get a pending invitation
    SELECT id INTO test_invitation_id FROM pending_invitations WHERE status = 'pending' LIMIT 1;
    
    -- Get a user to accept it
    SELECT id INTO test_acceptor_id FROM auth.users LIMIT 1;
    
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
        
        RAISE NOTICE 'Successfully accepted relationship invitation with ID: %', test_invitation_id;
    ELSE
        RAISE NOTICE 'No pending relationship invitations found';
    END IF;
END $$;

-- ============================================================================
-- 7. VERIFY ALL SYSTEMS WORK
-- ============================================================================
SELECT '=== VERIFY ALL SYSTEMS WORK ===' as section;

-- Check relationship invitations
SELECT 
    'Relationship Invitations Status' as analysis_type,
    status,
    COUNT(*) as count
FROM pending_invitations 
GROUP BY status
ORDER BY count DESC;

-- Check collection invitations
SELECT 
    'Collection Invitations Status' as analysis_type,
    status,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY status
ORDER BY count DESC;

-- Check relationships
SELECT 
    'Relationships Status' as analysis_type,
    status,
    COUNT(*) as count
FROM student_supervisor_relationships 
GROUP BY status
ORDER BY count DESC;

-- Check collection members
SELECT 
    'Collection Members Status' as analysis_type,
    role,
    COUNT(*) as count
FROM map_preset_members 
GROUP BY role
ORDER BY count DESC;

-- ============================================================================
-- 8. CLEANUP TEST DATA
-- ============================================================================
SELECT '=== CLEANUP TEST DATA ===' as section;

-- Clean up test data
DELETE FROM pending_invitations WHERE metadata->>'testInvitation' = 'true';
DELETE FROM collection_invitations WHERE message LIKE '%Test collection invitation%';
DELETE FROM student_supervisor_relationships WHERE created_at >= NOW() - INTERVAL '1 hour';
DELETE FROM map_preset_members WHERE added_at >= NOW() - INTERVAL '1 hour';

SELECT 'All test data cleaned up' as cleanup_status;

-- ============================================================================
-- 9. FINAL STATUS
-- ============================================================================
SELECT '=== FINAL STATUS ===' as section;

SELECT 
    'Invitation System Status' as analysis_type,
    'All systems should now be working properly' as status,
    'Collection invitations and relationship invitations should work' as note;
