-- Create the accept_invitation RPC function that the code expects
-- This will work with the existing invitation system

CREATE OR REPLACE FUNCTION accept_invitation(
  invitation_id UUID,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  target_student_id UUID;
  target_supervisor_id UUID;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE id = invitation_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No pending invitation found with ID: %', invitation_id;
    RETURN FALSE;
  END IF;
  
  RAISE NOTICE 'Processing invitation: % for user: %', invitation_id, user_id;
  RAISE NOTICE 'Email: %, Invited by: %', invitation_record.email, invitation_record.invited_by;
  RAISE NOTICE 'Relationship type: %', invitation_record.metadata->>'relationshipType';
  
  -- Determine who is student and who is supervisor based on relationship type
  IF invitation_record.metadata->>'relationshipType' = 'student_invites_supervisor' THEN
    -- Student invited supervisor, so inviter is student and accepter is supervisor
    target_student_id := invitation_record.invited_by;
    target_supervisor_id := user_id;
    RAISE NOTICE 'Student invites supervisor: student=%, supervisor=%', target_student_id, target_supervisor_id;
  ELSE
    -- Supervisor invited student, so inviter is supervisor and accepter is student
    target_student_id := user_id;
    target_supervisor_id := invitation_record.invited_by;
    RAISE NOTICE 'Supervisor invites student: student=%, supervisor=%', target_student_id, target_supervisor_id;
  END IF;
  
  -- Update invitation to accepted
  UPDATE pending_invitations 
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = user_id,
    updated_at = NOW()
  WHERE id = invitation_id;
  
  -- Create or update the relationship
  INSERT INTO student_supervisor_relationships (
    id,
    student_id, 
    supervisor_id, 
    status, 
    created_at
  )
  VALUES (
    gen_random_uuid(),
    target_student_id, 
    target_supervisor_id, 
    'active', 
    NOW()
  )
  ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
    status = 'active';
  
  RAISE NOTICE 'SUCCESS: Relationship created between student=% and supervisor=%', target_student_id, target_supervisor_id;
  
  -- Clean up any duplicate notifications for this invitation
  DELETE FROM notifications 
  WHERE metadata->>'invitation_id' = invitation_id::text;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in accept_invitation: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_invitation(UUID, UUID) TO authenticated;

-- Test the function exists
SELECT 'accept_invitation function created successfully' as status;
