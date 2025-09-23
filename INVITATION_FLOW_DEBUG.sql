-- INVITATION FLOW DEBUG - Test invitation creation, acceptance, and duplicate handling
-- This script helps debug the complete invitation flow

-- ============================================================================
-- 1. CURRENT SYSTEM STATE
-- ============================================================================
SELECT '=== CURRENT SYSTEM STATE ===' as section;

-- Get some test users
SELECT 
    'Available Test Users' as analysis_type,
    id,
    full_name,
    email,
    role
FROM profiles 
WHERE role IN ('student', 'instructor', 'school')
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. DUPLICATE INVITATION DETECTION
-- ============================================================================
SELECT '=== DUPLICATE INVITATION DETECTION ===' as section;

-- Check for duplicate relationship invitations
SELECT 
    'Duplicate Relationship Invitations' as analysis_type,
    email,
    invited_by,
    COUNT(*) as duplicate_count,
    STRING_AGG(status, ', ') as statuses,
    STRING_AGG(id::text, ', ') as invitation_ids
FROM pending_invitations 
GROUP BY email, invited_by
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check for duplicate collection invitations
SELECT 
    'Duplicate Collection Invitations' as analysis_type,
    invited_user_id,
    invited_by_user_id,
    preset_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(status, ', ') as statuses,
    STRING_AGG(id::text, ', ') as invitation_ids
FROM collection_invitations 
GROUP BY invited_user_id, invited_by_user_id, preset_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- 3. INVITATION ACCEPTANCE FLOW ANALYSIS
-- ============================================================================
SELECT '=== INVITATION ACCEPTANCE FLOW ANALYSIS ===' as section;

-- Check accepted invitations without relationships
SELECT 
    'Accepted Invitations Without Relationships' as analysis_type,
    pi.id as invitation_id,
    pi.email,
    pi.invited_by,
    pi.status,
    pi.accepted_at,
    pi.accepted_by
FROM pending_invitations pi
LEFT JOIN student_supervisor_relationships ssr ON (
    (ssr.student_id = pi.invited_by AND ssr.supervisor_id = pi.accepted_by) OR
    (ssr.student_id = pi.accepted_by AND ssr.supervisor_id = pi.invited_by)
)
WHERE pi.status = 'accepted' 
    AND ssr.id IS NULL
ORDER BY pi.accepted_at DESC;

-- Check relationships without corresponding accepted invitations
SELECT 
    'Relationships Without Accepted Invitations' as analysis_type,
    ssr.id as relationship_id,
    ssr.student_id,
    ssr.supervisor_id,
    ssr.created_at
FROM student_supervisor_relationships ssr
LEFT JOIN pending_invitations pi ON (
    (pi.invited_by = ssr.student_id AND pi.accepted_by = ssr.supervisor_id) OR
    (pi.invited_by = ssr.supervisor_id AND pi.accepted_by = ssr.student_id)
)
WHERE pi.id IS NULL
ORDER BY ssr.created_at DESC;

-- ============================================================================
-- 4. TEST INVITATION CREATION
-- ============================================================================
SELECT '=== TEST INVITATION CREATION ===' as section;

-- Create test relationship invitations (replace with actual user IDs)
-- This is a template - you'll need to replace the UUIDs with real user IDs
/*
INSERT INTO pending_invitations (
    email,
    role,
    invited_by,
    metadata,
    status
) VALUES 
    -- Test student inviting instructor
    ('test-instructor@example.com', 'instructor', 'YOUR_USER_ID_HERE', 
     '{"relationshipType": "student_invites_supervisor", "inviterRole": "student"}', 'pending'),
    
    -- Test instructor inviting student  
    ('test-student@example.com', 'student', 'YOUR_USER_ID_HERE',
     '{"relationshipType": "supervisor_invites_student", "inviterRole": "instructor"}', 'pending');
*/

-- ============================================================================
-- 5. TEST COLLECTION INVITATION CREATION
-- ============================================================================
SELECT '=== TEST COLLECTION INVITATION CREATION ===' as section;

-- Create test collection invitations (replace with actual IDs)
-- This is a template - you'll need to replace the UUIDs with real IDs
/*
INSERT INTO collection_invitations (
    preset_id,
    invited_user_id,
    invited_by_user_id,
    role,
    status,
    message
) VALUES 
    -- Test collection invitation
    ('YOUR_PRESET_ID_HERE', 'YOUR_INVITED_USER_ID_HERE', 'YOUR_INVITER_USER_ID_HERE',
     'read', 'pending', 'Test collection invitation');
*/

-- ============================================================================
-- 6. INVITATION ACCEPTANCE SIMULATION
-- ============================================================================
SELECT '=== INVITATION ACCEPTANCE SIMULATION ===' as section;

-- Template for accepting a relationship invitation
/*
-- Step 1: Update invitation status
UPDATE pending_invitations 
SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = 'TARGET_USER_ID_HERE'
WHERE id = 'INVITATION_ID_HERE';

-- Step 2: Create relationship
INSERT INTO student_supervisor_relationships (
    student_id,
    supervisor_id,
    status
) VALUES (
    'STUDENT_ID_HERE',
    'SUPERVISOR_ID_HERE', 
    'active'
);
*/

-- Template for accepting a collection invitation
/*
-- Step 1: Update collection invitation status
UPDATE collection_invitations 
SET 
    status = 'accepted',
    responded_at = NOW()
WHERE id = 'COLLECTION_INVITATION_ID_HERE';

-- Step 2: Add user to collection members
INSERT INTO map_preset_members (
    preset_id,
    user_id,
    added_by
) VALUES (
    'PRESET_ID_HERE',
    'USER_ID_HERE',
    'INVITER_USER_ID_HERE'
);
*/

-- ============================================================================
-- 7. INVITATION REJECTION SIMULATION
-- ============================================================================
SELECT '=== INVITATION REJECTION SIMULATION ===' as section;

-- Template for rejecting a relationship invitation
/*
UPDATE pending_invitations 
SET 
    status = 'declined',
    accepted_at = NOW(),
    accepted_by = 'TARGET_USER_ID_HERE'
WHERE id = 'INVITATION_ID_HERE';
*/

-- Template for rejecting a collection invitation
/*
UPDATE collection_invitations 
SET 
    status = 'declined',
    responded_at = NOW()
WHERE id = 'COLLECTION_INVITATION_ID_HERE';
*/

-- ============================================================================
-- 8. DUPLICATE PREVENTION CHECK
-- ============================================================================
SELECT '=== DUPLICATE PREVENTION CHECK ===' as section;

-- Check if there are existing relationships before creating invitations
SELECT 
    'Existing Relationships Check' as analysis_type,
    'Relationships exist' as status,
    COUNT(*) as count
FROM student_supervisor_relationships 
WHERE status = 'active';

-- Check for pending invitations that should be filtered out
SELECT 
    'Pending Invitations to Filter' as analysis_type,
    pi.id,
    pi.email,
    pi.invited_by,
    pi.status,
    'Should be filtered if relationship exists' as note
FROM pending_invitations pi
WHERE pi.status = 'pending'
    AND EXISTS (
        SELECT 1 FROM student_supervisor_relationships ssr 
        WHERE ssr.status = 'active'
        AND (
            (ssr.student_id = pi.invited_by AND ssr.supervisor_id = pi.accepted_by) OR
            (ssr.student_id = pi.accepted_by AND ssr.supervisor_id = pi.invited_by)
        )
    );

-- ============================================================================
-- 9. NOTIFICATION CLEANUP CHECK
-- ============================================================================
SELECT '=== NOTIFICATION CLEANUP CHECK ===' as section;

-- Check for notifications that should be cleaned up
SELECT 
    'Notifications to Cleanup' as analysis_type,
    n.id,
    n.type,
    n.user_id,
    n.actor_id,
    n.is_read,
    n.created_at
FROM notifications n
WHERE n.type IN ('supervisor_invitation', 'student_invitation', 'collection_invitation')
    AND n.created_at < NOW() - INTERVAL '30 days'
    AND n.is_read = false
ORDER BY n.created_at DESC;

-- ============================================================================
-- 10. COMPLETE FLOW TEST
-- ============================================================================
SELECT '=== COMPLETE FLOW TEST ===' as section;

-- Test the complete invitation flow
SELECT 
    'Complete Flow Test' as analysis_type,
    'Step 1: Create invitation' as step,
    'Use the INSERT templates above' as instruction

UNION ALL

SELECT 
    'Complete Flow Test' as analysis_type,
    'Step 2: Check for duplicates' as step,
    'Run duplicate detection queries' as instruction

UNION ALL

SELECT 
    'Complete Flow Test' as analysis_type,
    'Step 3: Accept invitation' as step,
    'Use the UPDATE and INSERT templates above' as instruction

UNION ALL

SELECT 
    'Complete Flow Test' as analysis_type,
    'Step 4: Verify relationship created' as step,
    'Check student_supervisor_relationships table' as instruction

UNION ALL

SELECT 
    'Complete Flow Test' as analysis_type,
    'Step 5: Clean up old invitations' as step,
    'Remove or mark as processed' as instruction;
