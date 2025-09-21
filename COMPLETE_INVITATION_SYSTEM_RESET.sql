-- COMPLETE INVITATION SYSTEM RESET
-- This script will reset ALL invitation-related data for a fresh start
-- ⚠️ WARNING: This will delete ALL relationships, invitations, and notifications!

-- =============================================================================
-- 1. BACKUP CURRENT DATA (OPTIONAL - FOR SAFETY)
-- =============================================================================

-- Create backup tables before deletion (uncomment if you want backups)
-- CREATE TABLE pending_invitations_backup AS SELECT * FROM pending_invitations;
-- CREATE TABLE notifications_backup AS SELECT * FROM notifications WHERE type LIKE '%invitation%' OR type LIKE '%relationship%';
-- CREATE TABLE student_supervisor_relationships_backup AS SELECT * FROM student_supervisor_relationships;
-- CREATE TABLE collection_invitations_backup AS SELECT * FROM collection_invitations;

-- =============================================================================
-- 2. DELETE ALL INVITATION-RELATED DATA
-- =============================================================================

-- Delete all notifications related to invitations and relationships
DELETE FROM notifications 
WHERE type::text LIKE '%invitation%' 
   OR type::text LIKE '%relationship%'
   OR type::text LIKE '%supervisor%'
   OR type::text LIKE '%student%'
   OR metadata->>'invitation_id' IS NOT NULL;

-- Delete all pending invitations
DELETE FROM pending_invitations;

-- Delete all student-supervisor relationships
DELETE FROM student_supervisor_relationships;

-- Delete all collection invitations
DELETE FROM collection_invitations;

-- Delete any collection memberships (optional - uncomment if you want to reset collections too)
-- DELETE FROM map_preset_members;

-- =============================================================================
-- 3. RESET SEQUENCES AND CLEAN UP
-- =============================================================================

-- Reset any auto-increment sequences (if any exist)
-- Note: UUIDs don't use sequences, but this is here for completeness

-- =============================================================================
-- 4. VERIFY CLEANUP
-- =============================================================================

-- Check that everything is cleaned up
SELECT 'CLEANUP_VERIFICATION' as check_type,
       'pending_invitations' as table_name,
       COUNT(*) as remaining_records
FROM pending_invitations

UNION ALL

SELECT 'CLEANUP_VERIFICATION',
       'notifications (invitation-related)',
       COUNT(*)
FROM notifications
WHERE type::text LIKE '%invitation%' 
   OR type::text LIKE '%relationship%'
   OR type::text LIKE '%supervisor%'
   OR type::text LIKE '%student%'

UNION ALL

SELECT 'CLEANUP_VERIFICATION',
       'student_supervisor_relationships',
       COUNT(*)
FROM student_supervisor_relationships

UNION ALL

SELECT 'CLEANUP_VERIFICATION',
       'collection_invitations',
       COUNT(*)
FROM collection_invitations;

-- =============================================================================
-- 5. RECREATE ESSENTIAL FUNCTIONS (CLEAN VERSIONS)
-- =============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS accept_invitation_fixed(TEXT, UUID);
DROP FUNCTION IF EXISTS accept_notification_invitation(TEXT, UUID);
DROP FUNCTION IF EXISTS accept_any_invitation_universal(TEXT, UUID);
DROP FUNCTION IF EXISTS accept_invitation_with_cleanup(TEXT, UUID);
DROP FUNCTION IF EXISTS decline_invitation_with_cleanup(TEXT, UUID);
DROP FUNCTION IF EXISTS cleanup_orphaned_invitation_notifications();
DROP FUNCTION IF EXISTS cleanup_duplicate_relationships();
DROP FUNCTION IF EXISTS cleanup_stale_invitations();
DROP FUNCTION IF EXISTS comprehensive_invitation_cleanup();

-- Create clean, simple invitation acceptance function
CREATE OR REPLACE FUNCTION accept_invitation_clean(
    p_invitation_id TEXT,
    p_accepted_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    student_id UUID;
    supervisor_id UUID;
    result JSON;
BEGIN
    -- Find the invitation
    SELECT * INTO invitation_record 
    FROM pending_invitations 
    WHERE id::TEXT = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- Check if already accepted
    IF invitation_record.status = 'accepted' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation already accepted'
        );
    END IF;
    
    -- Determine student and supervisor IDs
    IF invitation_record.role = 'instructor' OR invitation_record.role = 'supervisor' THEN
        supervisor_id := p_accepted_by;
        student_id := invitation_record.invited_by;
    ELSIF invitation_record.role = 'student' THEN
        student_id := p_accepted_by;
        supervisor_id := invitation_record.invited_by;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid invitation role'
        );
    END IF;
    
    -- Validate IDs
    IF student_id IS NULL OR supervisor_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Missing student or supervisor ID'
        );
    END IF;
    
    -- Check if relationship already exists
    IF EXISTS (
        SELECT 1 FROM student_supervisor_relationships 
        WHERE student_id = accept_invitation_clean.student_id 
        AND supervisor_id = accept_invitation_clean.supervisor_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Relationship already exists'
        );
    END IF;
    
    -- Create the relationship
    INSERT INTO student_supervisor_relationships (
        student_id,
        supervisor_id,
        invitation_id,
        created_at
    ) VALUES (
        accept_invitation_clean.student_id,
        accept_invitation_clean.supervisor_id,
        invitation_record.id,
        NOW()
    );
    
    -- Update invitation status
    UPDATE pending_invitations 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_accepted_by,
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation accepted successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Create clean invitation decline function
CREATE OR REPLACE FUNCTION decline_invitation_clean(
    p_invitation_id TEXT,
    p_declined_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Update invitation status to declined
    UPDATE pending_invitations 
    SET 
        status = 'declined',
        accepted_by = p_declined_by,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id::TEXT = p_invitation_id;
    
    -- Check if any rows were affected
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation declined successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Create function to create a new invitation
CREATE OR REPLACE FUNCTION create_invitation_clean(
    p_email TEXT,
    p_role TEXT,
    p_invited_by UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_invitation_id UUID;
    result JSON;
BEGIN
    -- Insert new invitation
    INSERT INTO pending_invitations (
        email,
        role,
        invited_by,
        status,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_email,
        p_role,
        p_invited_by,
        'pending',
        p_metadata,
        NOW(),
        NOW()
    ) RETURNING id INTO new_invitation_id;
    
    RETURN json_build_object(
        'success', true,
        'invitation_id', new_invitation_id,
        'message', 'Invitation created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =============================================================================
-- 6. CREATE TEST DATA (OPTIONAL)
-- =============================================================================

-- Uncomment the following lines to create test invitations
-- Replace with actual user IDs and emails from your system

/*
-- Create test invitations (replace with real user IDs and emails)
SELECT create_invitation_clean(
    'student@example.com',
    'student',
    'supervisor-user-id-here',
    '{"test": true}'::jsonb
);

SELECT create_invitation_clean(
    'instructor@example.com',
    'instructor',
    'student-user-id-here',
    '{"test": true}'::jsonb
);
*/

-- =============================================================================
-- 7. FINAL VERIFICATION
-- =============================================================================

-- Show current state
SELECT 'FINAL_STATE' as status,
       'pending_invitations' as table_name,
       COUNT(*) as count
FROM pending_invitations

UNION ALL

SELECT 'FINAL_STATE',
       'student_supervisor_relationships',
       COUNT(*)
FROM student_supervisor_relationships

UNION ALL

SELECT 'FINAL_STATE',
       'notifications (invitation-related)',
       COUNT(*)
FROM notifications
WHERE type::text LIKE '%invitation%' 
   OR type::text LIKE '%relationship%';

-- Show available functions
SELECT 'AVAILABLE_FUNCTIONS' as info,
       'accept_invitation_clean' as function_name,
       'Accepts invitations and creates relationships' as description

UNION ALL

SELECT 'AVAILABLE_FUNCTIONS',
       'decline_invitation_clean',
       'Declines invitations by updating status'

UNION ALL

SELECT 'AVAILABLE_FUNCTIONS',
       'create_invitation_clean',
       'Creates new invitations';

-- =============================================================================
-- 8. USAGE INSTRUCTIONS
-- =============================================================================

-- To accept an invitation:
-- SELECT accept_invitation_clean('invitation-id-here', 'user-id-here');

-- To decline an invitation:
-- SELECT decline_invitation_clean('invitation-id-here', 'user-id-here');

-- To create a new invitation:
-- SELECT create_invitation_clean('email@example.com', 'student', 'inviter-user-id-here');

-- =============================================================================
-- RESET COMPLETE!
-- =============================================================================

SELECT 'RESET_COMPLETE' as status,
       'All invitation data has been reset' as message,
       'You can now start fresh with the invitation system' as next_steps;
