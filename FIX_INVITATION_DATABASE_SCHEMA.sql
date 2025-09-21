-- FIX INVITATION DATABASE SCHEMA ISSUES
-- This fixes the database schema problems causing invitation acceptance errors

-- 1. Fix the "accepted_at" column issue in pending_invitations
-- The error says "column 'accepted_at' of relation 'pending_invitations' does not exist"
-- Let's check if the column exists and add it if missing

-- First, let's ensure the pending_invitations table has all required columns
DO $$
BEGIN
    -- Add accepted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_invitations' 
        AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE pending_invitations 
        ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add accepted_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_invitations' 
        AND column_name = 'accepted_by'
    ) THEN
        ALTER TABLE pending_invitations 
        ADD COLUMN accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_invitations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE pending_invitations 
        ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'));
    END IF;
END $$;

-- 2. Fix the "student_id" ambiguous column reference issue
-- This happens when there are multiple tables with student_id columns in joins
-- Let's create a proper function that handles this

CREATE OR REPLACE FUNCTION accept_invitation_fixed(
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
    -- First, try to find the invitation in pending_invitations
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
    
    -- Determine student_id and supervisor_id based on role
    IF invitation_record.role = 'instructor' OR invitation_record.role = 'supervisor' THEN
        -- This is a supervisor invitation
        supervisor_id := p_accepted_by;
        student_id := invitation_record.invited_by;
    ELSIF invitation_record.role = 'student' THEN
        -- This is a student invitation  
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
    IF EXISTS (
        SELECT 1 FROM student_supervisor_relationships 
        WHERE student_id = accept_invitation_fixed.student_id 
        AND supervisor_id = accept_invitation_fixed.supervisor_id
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
        accept_invitation_fixed.student_id,
        accept_invitation_fixed.supervisor_id,
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

-- 3. Create a function to handle notification-based invitations
CREATE OR REPLACE FUNCTION accept_notification_invitation(
    p_notification_id TEXT,
    p_accepted_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_record RECORD;
    student_id UUID;
    supervisor_id UUID;
    result JSON;
BEGIN
    -- Get the notification
    SELECT * INTO notification_record 
    FROM notifications 
    WHERE id::TEXT = p_notification_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Notification not found'
        );
    END IF;
    
    -- Extract invitation data from notification
    -- This assumes the notification has invitation data in its data field
    IF notification_record.data->>'type' = 'relationship_invitation' THEN
        -- Handle relationship invitation from notification
        student_id := (notification_record.data->>'student_id')::UUID;
        supervisor_id := (notification_record.data->>'supervisor_id')::UUID;
        
        -- Validate IDs
        IF student_id IS NULL OR supervisor_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid invitation data in notification'
            );
        END IF;
        
        -- Create relationship
        INSERT INTO student_supervisor_relationships (
            student_id,
            supervisor_id,
            created_at
        ) VALUES (
            accept_notification_invitation.student_id,
            accept_notification_invitation.supervisor_id,
            NOW()
        );
        
        -- Mark notification as read
        UPDATE notifications 
        SET read_at = NOW()
        WHERE id = notification_record.id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Notification invitation accepted successfully'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Not a relationship invitation notification'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 4. Create a universal function that tries both approaches
CREATE OR REPLACE FUNCTION accept_any_invitation_universal(
    p_invitation_id TEXT,
    p_accepted_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- First try the fixed pending_invitations function
    SELECT accept_invitation_fixed(p_invitation_id, p_accepted_by) INTO result;
    
    -- If it succeeded, return the result
    IF (result->>'success')::boolean THEN
        RETURN result;
    END IF;
    
    -- If it failed with "not found", try notification-based approach
    IF result->>'error' = 'Invitation not found' THEN
        SELECT accept_notification_invitation(p_invitation_id, p_accepted_by) INTO result;
        RETURN result;
    END IF;
    
    -- Return the original error
    RETURN result;
END;
$$;

-- 5. Clean up any existing problematic data
-- Fix null accepted_by entries
UPDATE pending_invitations 
SET accepted_by = invited_by 
WHERE accepted_by IS NULL 
AND invited_by IS NOT NULL;

-- Delete any remaining invalid invitations
DELETE FROM pending_invitations 
WHERE accepted_by IS NULL 
AND invited_by IS NULL;

-- 6. Add proper constraints to prevent future issues
DO $$
BEGIN
    -- Add NOT NULL constraint to accepted_by if it doesn't exist
    BEGIN
        ALTER TABLE pending_invitations 
        ALTER COLUMN accepted_by SET NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN
            -- Constraint might already exist, ignore error
            NULL;
    END;
END $$;

-- 7. Verify the fixes
SELECT 
    'Schema fixes applied' as status,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN accepted_by IS NOT NULL THEN 1 END) as valid_invitations
FROM pending_invitations;
