-- Migration: Enhance invitation system to support bidirectional invitations (SAFE VERSION)
-- Date: 2025-01-13
-- Description: Allow students to invite supervisors and improve invitation metadata

-- Add relationship type tracking to pending_invitations metadata
COMMENT ON COLUMN pending_invitations.metadata IS 
'Stores invitation metadata including:
- supervisorName: Name of the inviter
- inviterRole: Role of the person sending invitation (student/instructor/school/admin)
- relationshipType: Type of relationship (student_invites_supervisor/supervisor_invites_student)
- invitedAt: Timestamp of invitation';

-- Drop existing function if exists
DROP FUNCTION IF EXISTS accept_invitation_and_create_relationship() CASCADE;

-- Create function to handle invitation acceptance with automatic relationship creation
CREATE OR REPLACE FUNCTION accept_invitation_and_create_relationship()
RETURNS TRIGGER AS $$
DECLARE
    v_metadata jsonb;
    v_relationship_type text;
    v_inviter_role text;
BEGIN
    -- Only process when status changes to 'accepted'
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        v_metadata := NEW.metadata;
        v_relationship_type := v_metadata->>'relationshipType';
        v_inviter_role := v_metadata->>'inviterRole';
        
        -- Create appropriate relationship based on invitation type
        IF v_relationship_type = 'student_invites_supervisor' THEN
            -- Student invited someone to be their supervisor
            INSERT INTO user_relationships (supervisor_id, student_id, created_at)
            VALUES (NEW.accepted_by, NEW.invited_by, NOW())
            ON CONFLICT DO NOTHING;
            
        ELSIF v_relationship_type = 'supervisor_invites_student' THEN
            -- Supervisor invited a student
            INSERT INTO user_relationships (supervisor_id, student_id, created_at)
            VALUES (NEW.invited_by, NEW.accepted_by, NOW())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic relationship creation
DROP TRIGGER IF EXISTS auto_create_relationship_on_invitation_accept ON pending_invitations;
CREATE TRIGGER auto_create_relationship_on_invitation_accept
    AFTER UPDATE ON pending_invitations
    FOR EACH ROW
    EXECUTE FUNCTION accept_invitation_and_create_relationship();

-- Add index for faster invitation queries
CREATE INDEX IF NOT EXISTS idx_pending_invitations_metadata_relationship_type 
ON pending_invitations ((metadata->>'relationshipType'));

-- Drop and recreate view
DROP VIEW IF EXISTS invitation_details;
CREATE VIEW invitation_details AS
SELECT 
    pi.*,
    pi.metadata->>'supervisorName' as inviter_name,
    pi.metadata->>'inviterRole' as inviter_role,
    pi.metadata->>'relationshipType' as relationship_type,
    p1.full_name as invited_by_name,
    p1.email as invited_by_email,
    p2.full_name as accepted_by_name,
    p2.email as accepted_by_email
FROM pending_invitations pi
LEFT JOIN profiles p1 ON pi.invited_by = p1.id
LEFT JOIN profiles p2 ON pi.accepted_by = p2.id;

-- Grant permissions
GRANT SELECT ON invitation_details TO authenticated;

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first to avoid conflicts
DO $$
BEGIN
    -- Drop all existing policies on pending_invitations
    DROP POLICY IF EXISTS "Users can view their invitations" ON pending_invitations;
    DROP POLICY IF EXISTS "Users can create invitations" ON pending_invitations;
    DROP POLICY IF EXISTS "Users can accept invitations" ON pending_invitations;
    DROP POLICY IF EXISTS "users_view_own_invitations_v2" ON pending_invitations;
    DROP POLICY IF EXISTS "users_create_invitations_v2" ON pending_invitations;
    DROP POLICY IF EXISTS "users_accept_invitations_v2" ON pending_invitations;
END $$;

-- Create new policies with unique names
CREATE POLICY "view_invitations_policy_v3" ON pending_invitations
    FOR SELECT
    USING (
        auth.uid() = invited_by OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "create_invitations_policy_v3" ON pending_invitations
    FOR INSERT
    WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "accept_invitations_policy_v3" ON pending_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Drop and recreate functions
DROP FUNCTION IF EXISTS get_user_invitation_summary(uuid);
CREATE FUNCTION get_user_invitation_summary(user_id uuid)
RETURNS TABLE (
    sent_invitations_count int,
    received_invitations_count int,
    pending_sent int,
    pending_received int,
    accepted_sent int,
    accepted_received int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE invited_by = user_id)::int,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id))::int,
        COUNT(*) FILTER (WHERE invited_by = user_id AND status = 'pending')::int,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id) AND status = 'pending')::int,
        COUNT(*) FILTER (WHERE invited_by = user_id AND status = 'accepted')::int,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id) AND status = 'accepted')::int
    FROM pending_invitations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_invitation_summary TO authenticated;

-- Rate limiting function
DROP FUNCTION IF EXISTS check_invitation_rate_limit(uuid);
CREATE FUNCTION check_invitation_rate_limit(user_id uuid)
RETURNS boolean AS $$
DECLARE
    daily_count int;
    hourly_count int;
BEGIN
    SELECT COUNT(*) INTO daily_count
    FROM pending_invitations
    WHERE invited_by = user_id
    AND created_at > NOW() - INTERVAL '24 hours';
    
    SELECT COUNT(*) INTO hourly_count
    FROM pending_invitations
    WHERE invited_by = user_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN daily_count < 20 AND hourly_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_invitation_rate_limit TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Enhanced invitation system with bidirectional support is now active.';
END $$;