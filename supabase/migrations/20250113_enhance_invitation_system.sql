-- Migration: Enhance invitation system to support bidirectional invitations
-- Date: 2025-01-13
-- Description: Allow students to invite supervisors and improve invitation metadata

-- Add relationship type tracking to pending_invitations metadata
-- The metadata JSONB field already exists, we just need to document the new structure
COMMENT ON COLUMN pending_invitations.metadata IS 
'Stores invitation metadata including:
- supervisorName: Name of the inviter
- inviterRole: Role of the person sending invitation (student/instructor/school/admin)
- relationshipType: Type of relationship (student_invites_supervisor/supervisor_invites_student)
- invitedAt: Timestamp of invitation';

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
            -- Create supervisor-student relationship
            INSERT INTO user_relationships (supervisor_id, student_id, created_at)
            VALUES (NEW.accepted_by, NEW.invited_by, NOW())
            ON CONFLICT DO NOTHING;
            
        ELSIF v_relationship_type = 'supervisor_invites_student' THEN
            -- Supervisor invited a student
            -- Create supervisor-student relationship
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

-- Create view for enhanced invitation details
CREATE OR REPLACE VIEW invitation_details AS
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

-- Grant appropriate permissions
GRANT SELECT ON invitation_details TO authenticated;

-- Add RLS policies for invitation management
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations" ON pending_invitations
    FOR SELECT
    USING (
        auth.uid() = invited_by OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Policy: Users can create invitations
CREATE POLICY "Users can create invitations" ON pending_invitations
    FOR INSERT
    WITH CHECK (auth.uid() = invited_by);

-- Policy: Users can update invitations they received
CREATE POLICY "Users can accept invitations" ON pending_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Add function to get invitation summary for users
CREATE OR REPLACE FUNCTION get_user_invitation_summary(user_id uuid)
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
        COUNT(*) FILTER (WHERE invited_by = user_id)::int as sent_invitations_count,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id))::int as received_invitations_count,
        COUNT(*) FILTER (WHERE invited_by = user_id AND status = 'pending')::int as pending_sent,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id) AND status = 'pending')::int as pending_received,
        COUNT(*) FILTER (WHERE invited_by = user_id AND status = 'accepted')::int as accepted_sent,
        COUNT(*) FILTER (WHERE email = (SELECT email FROM auth.users WHERE id = user_id) AND status = 'accepted')::int as accepted_received
    FROM pending_invitations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_invitation_summary TO authenticated;

-- Add rate limiting check function
CREATE OR REPLACE FUNCTION check_invitation_rate_limit(user_id uuid)
RETURNS boolean AS $$
DECLARE
    daily_count int;
    hourly_count int;
    DAILY_LIMIT constant int := 20; -- Increased for legitimate use cases
    HOURLY_LIMIT constant int := 5;
BEGIN
    -- Check daily limit
    SELECT COUNT(*) INTO daily_count
    FROM pending_invitations
    WHERE invited_by = user_id
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Check hourly limit
    SELECT COUNT(*) INTO hourly_count
    FROM pending_invitations
    WHERE invited_by = user_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN daily_count < DAILY_LIMIT AND hourly_count < HOURLY_LIMIT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_invitation_rate_limit TO authenticated;