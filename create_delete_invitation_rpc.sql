-- Create RPC function to delete pending invitations
-- This function can bypass RLS policies and should work for deletion

-- 1. Create the RPC function
CREATE OR REPLACE FUNCTION delete_pending_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  deleted_count INTEGER := 0;
  result JSON;
BEGIN
  -- Delete from pending_invitations table
  DELETE FROM pending_invitations 
  WHERE id = invitation_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete from notifications table if it exists
  DELETE FROM notifications 
  WHERE id = invitation_id 
     OR metadata->>'invitation_id' = invitation_id::text;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'invitation_id', invitation_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'invitation_id', invitation_id
    );
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_pending_invitation(UUID) TO authenticated;

-- 3. Test the function
SELECT delete_pending_invitation('efa685a3-b352-4f2e-a1d5-23e54feec8d4');
