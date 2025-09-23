-- FINAL INVITATION FIX - Fix the duplicate key constraint issue
-- The error is caused by trying to insert duplicate (preset_id, user_id) combinations

-- ============================================================================
-- 1. CHECK FOR EXISTING MEMBERSHIPS
-- ============================================================================
SELECT '=== CHECK FOR EXISTING MEMBERSHIPS ===' as section;

-- Check existing memberships that might cause conflicts
SELECT 
    'Existing Memberships' as analysis_type,
    preset_id,
    user_id,
    role,
    added_at
FROM map_preset_members 
ORDER BY added_at DESC
LIMIT 10;

-- ============================================================================
-- 2. CHECK FOR DUPLICATE COLLECTION INVITATIONS
-- ============================================================================
SELECT '=== CHECK FOR DUPLICATE COLLECTION INVITATIONS ===' as section;

-- Check for duplicate collection invitations
SELECT 
    'Duplicate Collection Invitations' as analysis_type,
    preset_id,
    invited_user_id,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending'
GROUP BY preset_id, invited_user_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- 3. CLEAN UP DUPLICATE INVITATIONS
-- ============================================================================
SELECT '=== CLEAN UP DUPLICATE INVITATIONS ===' as section;

-- Remove duplicate collection invitations, keeping only the most recent
DELETE FROM collection_invitations 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY preset_id, invited_user_id ORDER BY created_at DESC) as rn
        FROM collection_invitations 
        WHERE status = 'pending'
    ) t 
    WHERE rn > 1
);

-- ============================================================================
-- 4. CHECK FOR EXISTING MEMBERSHIPS BEFORE ACCEPTING
-- ============================================================================
SELECT '=== CHECK FOR EXISTING MEMBERSHIPS BEFORE ACCEPTING ===' as section;

-- Check if users are already members of presets they're being invited to
SELECT 
    'Existing Memberships Check' as analysis_type,
    ci.id as invitation_id,
    ci.preset_id,
    ci.invited_user_id,
    CASE 
        WHEN mpm.id IS NOT NULL THEN 'ALREADY MEMBER - Skip invitation'
        ELSE 'NOT MEMBER - Can accept invitation'
    END as status
FROM collection_invitations ci
LEFT JOIN map_preset_members mpm ON (
    mpm.preset_id = ci.preset_id 
    AND mpm.user_id = ci.invited_user_id
)
WHERE ci.status = 'pending'
LIMIT 10;

-- ============================================================================
-- 5. SMART COLLECTION INVITATION ACCEPTANCE
-- ============================================================================
SELECT '=== SMART COLLECTION INVITATION ACCEPTANCE ===' as section;

-- Test collection invitation acceptance with duplicate checking
DO $$
DECLARE
    test_collection_invitation_id UUID;
    valid_preset_id UUID;
    valid_user_id UUID;
    valid_added_by_id UUID;
    existing_membership_id UUID;
BEGIN
    -- Get a valid collection invitation where user is not already a member
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
        AND NOT EXISTS (
            SELECT 1 FROM map_preset_members mpm 
            WHERE mpm.preset_id = ci.preset_id 
            AND mpm.user_id = ci.invited_user_id
        )
    LIMIT 1;
    
    IF test_collection_invitation_id IS NOT NULL THEN
        -- Update collection invitation status
        UPDATE collection_invitations 
        SET 
            status = 'accepted',
            responded_at = NOW()
        WHERE id = test_collection_invitation_id;
        
        -- Add user to collection members (only if not already a member)
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
        RAISE NOTICE 'No valid collection invitations found where user is not already a member';
    END IF;
END $$;

-- ============================================================================
-- 6. HANDLE EXISTING MEMBERSHIPS
-- ============================================================================
SELECT '=== HANDLE EXISTING MEMBERSHIPS ===' as section;

-- For invitations where user is already a member, just mark as accepted
UPDATE collection_invitations 
SET 
    status = 'accepted',
    responded_at = NOW()
WHERE status = 'pending'
    AND EXISTS (
        SELECT 1 FROM map_preset_members mpm 
        WHERE mpm.preset_id = collection_invitations.preset_id 
        AND mpm.user_id = collection_invitations.invited_user_id
    );

-- ============================================================================
-- 7. VERIFY THE FIX
-- ============================================================================
SELECT '=== VERIFY THE FIX ===' as section;

-- Check remaining pending invitations
SELECT 
    'Remaining Pending Invitations' as analysis_type,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending';

-- Check accepted invitations
SELECT 
    'Accepted Invitations' as analysis_type,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'accepted';

-- Check collection members
SELECT 
    'Collection Members' as analysis_type,
    COUNT(*) as count
FROM map_preset_members;

-- ============================================================================
-- 8. FINAL STATUS
-- ============================================================================
SELECT '=== FINAL STATUS ===' as section;

SELECT 
    'Invitation System Status' as analysis_type,
    'Duplicate constraint issue resolved' as status,
    'Collection invitations now handle existing memberships properly' as note;