-- COMPREHENSIVE INVITATION SYSTEM ANALYSIS & FIXES
-- This file contains all the SQL needed to understand and fix the invitation system

-- =============================================================================
-- 1. ANALYZE CURRENT DATABASE STRUCTURE
-- =============================================================================

-- Check all invitation-related tables
SELECT 'TABLE_ANALYSIS' as section, 'pending_invitations' as table_name, COUNT(*) as record_count
FROM pending_invitations
UNION ALL
SELECT 'TABLE_ANALYSIS', 'notifications', COUNT(*)
FROM notifications
UNION ALL
SELECT 'TABLE_ANALYSIS', 'student_supervisor_relationships', COUNT(*)
FROM student_supervisor_relationships
UNION ALL
SELECT 'TABLE_ANALYSIS', 'collection_invitations', COUNT(*)
FROM collection_invitations;

-- Check pending_invitations structure and data
SELECT 'PENDING_INVITATIONS_ANALYSIS' as section, 
       id, 
       email, 
       role, 
       status, 
       invited_by, 
       accepted_by, 
       accepted_at,
       created_at,
       updated_at
FROM pending_invitations
ORDER BY created_at DESC;

-- Check notifications structure and data
SELECT 'NOTIFICATIONS_ANALYSIS' as section,
       id,
       user_id,
       actor_id,
       type,
       message,
       is_read,
       read_at,
       created_at,
       metadata
FROM notifications
WHERE type::text LIKE '%invitation%' OR type::text LIKE '%relationship%'
ORDER BY created_at DESC;

-- Check existing relationships
SELECT 'RELATIONSHIPS_ANALYSIS' as section,
       id,
       student_id,
       supervisor_id,
       status,
       invitation_id,
       created_at
FROM student_supervisor_relationships
ORDER BY created_at DESC;

-- =============================================================================
-- 2. IDENTIFY PROBLEMATIC DATA
-- =============================================================================

-- Find orphaned notifications (notifications without corresponding pending_invitations)
SELECT 'ORPHANED_NOTIFICATIONS' as issue_type,
       n.id as notification_id,
       n.type,
       n.message,
       n.created_at,
       n.metadata->>'invitation_id' as invitation_id_in_metadata
FROM notifications n
WHERE n.type::text LIKE '%invitation%' OR n.type::text LIKE '%relationship%'
AND NOT EXISTS (
    SELECT 1 FROM pending_invitations pi 
    WHERE pi.id::text = n.metadata->>'invitation_id'
);

-- Find duplicate relationships
SELECT 'DUPLICATE_RELATIONSHIPS' as issue_type,
       student_id,
       supervisor_id,
       COUNT(*) as duplicate_count,
       array_agg(id) as relationship_ids
FROM student_supervisor_relationships
GROUP BY student_id, supervisor_id
HAVING COUNT(*) > 1;

-- Find invitations that should be cleaned up
SELECT 'STALE_INVITATIONS' as issue_type,
       pi.id,
       pi.email,
       pi.status,
       pi.created_at,
       CASE 
           WHEN pi.created_at < NOW() - INTERVAL '30 days' THEN 'OLD'
           WHEN pi.status = 'accepted' AND NOT EXISTS (
               SELECT 1 FROM student_supervisor_relationships ssr 
               WHERE ssr.invitation_id = pi.id
           ) THEN 'ACCEPTED_BUT_NO_RELATIONSHIP'
           ELSE 'ACTIVE'
       END as issue
FROM pending_invitations pi
WHERE pi.status IN ('pending', 'accepted', 'declined');

-- =============================================================================
-- 3. CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up orphaned notifications
CREATE OR REPLACE FUNCTION cleanup_orphaned_invitation_notifications()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    result JSON;
BEGIN
    -- Delete notifications that reference non-existent invitations
    WITH orphaned_notifications AS (
        DELETE FROM notifications
        WHERE type::text LIKE '%invitation%' OR type::text LIKE '%relationship%'
        AND NOT EXISTS (
            SELECT 1 FROM pending_invitations pi 
            WHERE pi.id::text = notifications.metadata->>'invitation_id'
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM orphaned_notifications;
    
    result := json_build_object(
        'success', true,
        'deleted_orphaned_notifications', deleted_count,
        'message', 'Orphaned invitation notifications cleaned up'
    );
    
    RETURN result;
END;
$$;

-- Function to clean up duplicate relationships
CREATE OR REPLACE FUNCTION cleanup_duplicate_relationships()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    result JSON;
BEGIN
    -- Keep only the first relationship for each student-supervisor pair
    WITH duplicate_relationships AS (
        DELETE FROM student_supervisor_relationships
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (PARTITION BY student_id, supervisor_id ORDER BY created_at) as rn
                FROM student_supervisor_relationships
            ) ranked
            WHERE rn > 1
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM duplicate_relationships;
    
    result := json_build_object(
        'success', true,
        'deleted_duplicate_relationships', deleted_count,
        'message', 'Duplicate relationships cleaned up'
    );
    
    RETURN result;
END;
$$;

-- Function to clean up stale invitations
CREATE OR REPLACE FUNCTION cleanup_stale_invitations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    result JSON;
BEGIN
    -- Delete old pending invitations (older than 30 days)
    WITH stale_invitations AS (
        DELETE FROM pending_invitations
        WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM stale_invitations;
    
    result := json_build_object(
        'success', true,
        'deleted_stale_invitations', deleted_count,
        'message', 'Stale invitations cleaned up'
    );
    
    RETURN result;
END;
$$;

-- =============================================================================
-- 4. IMPROVED INVITATION ACCEPTANCE FUNCTION
-- =============================================================================

-- Enhanced function to accept invitations with proper cleanup
CREATE OR REPLACE FUNCTION accept_invitation_with_cleanup(
    p_invitation_id TEXT,
    p_accepted_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    notification_record RECORD;
    student_id UUID;
    supervisor_id UUID;
    relationship_exists BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- First, try to find the invitation in pending_invitations
    SELECT * INTO invitation_record 
    FROM pending_invitations 
    WHERE id::TEXT = p_invitation_id;
    
    IF NOT FOUND THEN
        -- Try to find in notifications
        SELECT * INTO notification_record 
        FROM notifications 
        WHERE id::TEXT = p_invitation_id
        AND (type LIKE '%invitation%' OR type LIKE '%relationship%');
        
        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invitation not found in pending_invitations or notifications'
            );
        END IF;
        
        -- Handle notification-based invitation
        student_id := (notification_record.metadata->>'student_id')::UUID;
        supervisor_id := (notification_record.metadata->>'supervisor_id')::UUID;
        
        IF student_id IS NULL OR supervisor_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid invitation data in notification'
            );
        END IF;
        
        -- Check if relationship already exists
        SELECT EXISTS(
            SELECT 1 FROM student_supervisor_relationships 
            WHERE student_id = accept_invitation_with_cleanup.student_id 
            AND supervisor_id = accept_invitation_with_cleanup.supervisor_id
        ) INTO relationship_exists;
        
        IF relationship_exists THEN
            -- Mark notification as read and delete it
            UPDATE notifications 
            SET is_read = true, read_at = NOW()
            WHERE id = notification_record.id;
            
            DELETE FROM notifications 
            WHERE id = notification_record.id;
            
            RETURN json_build_object(
                'success', true,
                'message', 'Relationship already exists, notification cleaned up'
            );
        END IF;
        
        -- Create the relationship
        INSERT INTO student_supervisor_relationships (
            student_id,
            supervisor_id,
            created_at
        ) VALUES (
            accept_invitation_with_cleanup.student_id,
            accept_invitation_with_cleanup.supervisor_id,
            NOW()
        );
        
        -- Delete the notification
        DELETE FROM notifications 
        WHERE id = notification_record.id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Notification invitation accepted and cleaned up'
        );
    END IF;
    
    -- Handle pending_invitations table invitation
    IF invitation_record.status = 'accepted' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation already accepted'
        );
    END IF;
    
    -- Determine student_id and supervisor_id based on role
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
    
    -- Validate that we have both IDs
    IF student_id IS NULL OR supervisor_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Missing student or supervisor ID'
        );
    END IF;
    
    -- Check if relationship already exists
    SELECT EXISTS(
        SELECT 1 FROM student_supervisor_relationships 
        WHERE student_id = accept_invitation_with_cleanup.student_id 
        AND supervisor_id = accept_invitation_with_cleanup.supervisor_id
    ) INTO relationship_exists;
    
    IF relationship_exists THEN
        -- Update invitation status and clean up
        UPDATE pending_invitations 
        SET 
            status = 'accepted',
            accepted_at = NOW(),
            accepted_by = p_accepted_by,
            updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Clean up any related notifications
        DELETE FROM notifications 
        WHERE metadata->>'invitation_id' = invitation_record.id::text;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Relationship already exists, invitation marked as accepted'
        );
    END IF;
    
    -- Create the relationship
    INSERT INTO student_supervisor_relationships (
        student_id,
        supervisor_id,
        invitation_id,
        created_at
    ) VALUES (
        accept_invitation_with_cleanup.student_id,
        accept_invitation_with_cleanup.supervisor_id,
        invitation_record.id,
        NOW()
    );
    
    -- Update the invitation status
    UPDATE pending_invitations 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_accepted_by,
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Clean up any related notifications
    DELETE FROM notifications 
    WHERE metadata->>'invitation_id' = invitation_record.id::text;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Invitation accepted successfully with cleanup'
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
-- 5. IMPROVED INVITATION DECLINE FUNCTION
-- =============================================================================

-- Enhanced function to decline invitations with proper cleanup
CREATE OR REPLACE FUNCTION decline_invitation_with_cleanup(
    p_invitation_id TEXT,
    p_declined_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    notification_record RECORD;
    deleted_notifications INTEGER := 0;
    result JSON;
BEGIN
    -- First, try to find the invitation in pending_invitations
    SELECT * INTO invitation_record 
    FROM pending_invitations 
    WHERE id::TEXT = p_invitation_id;
    
    IF FOUND THEN
        -- Update invitation status
        UPDATE pending_invitations 
        SET 
            status = 'declined',
            accepted_by = p_declined_by,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Delete any related notifications
        WITH deleted_notifs AS (
            DELETE FROM notifications 
            WHERE metadata->>'invitation_id' = invitation_record.id::text
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_notifications FROM deleted_notifs;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Invitation declined and notifications cleaned up',
            'deleted_notifications', deleted_notifications
        );
    END IF;
    
    -- Try to find in notifications
    SELECT * INTO notification_record 
    FROM notifications 
    WHERE id::TEXT = p_invitation_id
    AND (type::text LIKE '%invitation%' OR type::text LIKE '%relationship%');
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- Delete the notification
    DELETE FROM notifications 
    WHERE id = notification_record.id;
    
    -- Also delete any other notifications with the same invitation_id in metadata
    WITH deleted_notifs AS (
        DELETE FROM notifications 
        WHERE metadata->>'invitation_id' = notification_record.metadata->>'invitation_id'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_notifications FROM deleted_notifs;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Notification invitation declined and cleaned up',
        'deleted_notifications', deleted_notifications
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
-- 6. COMPREHENSIVE CLEANUP FUNCTION
-- =============================================================================

-- Master cleanup function that runs all cleanup operations
CREATE OR REPLACE FUNCTION comprehensive_invitation_cleanup()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_result JSON;
    duplicate_result JSON;
    stale_result JSON;
    final_result JSON;
BEGIN
    -- Run all cleanup functions
    SELECT cleanup_orphaned_invitation_notifications() INTO orphaned_result;
    SELECT cleanup_duplicate_relationships() INTO duplicate_result;
    SELECT cleanup_stale_invitations() INTO stale_result;
    
    -- Combine results
    final_result := json_build_object(
        'success', true,
        'orphaned_cleanup', orphaned_result,
        'duplicate_cleanup', duplicate_result,
        'stale_cleanup', stale_result,
        'message', 'Comprehensive invitation cleanup completed'
    );
    
    RETURN final_result;
END;
$$;

-- =============================================================================
-- 7. EXECUTE CLEANUP AND ANALYSIS
-- =============================================================================

-- Run the comprehensive cleanup
SELECT 'CLEANUP_EXECUTION' as section, comprehensive_invitation_cleanup() as result;

-- Re-analyze after cleanup
SELECT 'POST_CLEANUP_ANALYSIS' as section, 'pending_invitations' as table_name, COUNT(*) as record_count
FROM pending_invitations
UNION ALL
SELECT 'POST_CLEANUP_ANALYSIS', 'notifications', COUNT(*)
FROM notifications
WHERE type::text LIKE '%invitation%' OR type::text LIKE '%relationship%'
UNION ALL
SELECT 'POST_CLEANUP_ANALYSIS', 'student_supervisor_relationships', COUNT(*)
FROM student_supervisor_relationships;

-- =============================================================================
-- 8. TEST THE NEW FUNCTIONS
-- =============================================================================

-- Test the new acceptance function (replace with actual invitation ID)
-- SELECT 'TEST_ACCEPTANCE' as test_type, accept_invitation_with_cleanup('YOUR_INVITATION_ID_HERE', 'YOUR_USER_ID_HERE') as result;

-- Test the new decline function (replace with actual invitation ID)
-- SELECT 'TEST_DECLINE' as test_type, decline_invitation_with_cleanup('YOUR_INVITATION_ID_HERE', 'YOUR_USER_ID_HERE') as result;

-- =============================================================================
-- 9. FINAL VERIFICATION
-- =============================================================================

-- Check for any remaining issues
SELECT 'FINAL_VERIFICATION' as check_type,
       'Orphaned notifications' as issue,
       COUNT(*) as count
FROM notifications n
WHERE (n.type::text LIKE '%invitation%' OR n.type::text LIKE '%relationship%')
AND NOT EXISTS (
    SELECT 1 FROM pending_invitations pi 
    WHERE pi.id::text = n.metadata->>'invitation_id'
)

UNION ALL

SELECT 'FINAL_VERIFICATION',
       'Duplicate relationships',
       COUNT(*) - COUNT(DISTINCT student_id, supervisor_id)
FROM student_supervisor_relationships

UNION ALL

SELECT 'FINAL_VERIFICATION',
       'Stale pending invitations',
       COUNT(*)
FROM pending_invitations
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '7 days';
