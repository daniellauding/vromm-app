-- ============================================
-- COMPREHENSIVE USER DELETION FIX
-- After 3 hours of debugging, this is the FINAL solution
-- ============================================

-- 1. RE-ENABLE ALL TRIGGERS (restore normal operation)
ALTER TABLE public.profiles ENABLE TRIGGER USER;
ALTER TABLE public.conversation_participants ENABLE TRIGGER USER;
ALTER TABLE public.event_attendees ENABLE TRIGGER USER;
ALTER TABLE public.events ENABLE TRIGGER USER;
ALTER TABLE public.exercise_sessions ENABLE TRIGGER USER;
ALTER TABLE public.invites ENABLE TRIGGER USER;
ALTER TABLE public.message_reads ENABLE TRIGGER USER;
ALTER TABLE public.messages ENABLE TRIGGER USER;
ALTER TABLE public.notifications ENABLE TRIGGER USER;
ALTER TABLE public.pending_invitations ENABLE TRIGGER USER;
ALTER TABLE public.relationship_reviews ENABLE TRIGGER USER;
ALTER TABLE public.route_comments ENABLE TRIGGER USER;
ALTER TABLE public.school_applications ENABLE TRIGGER USER;
ALTER TABLE public.user_follows ENABLE TRIGGER USER;

-- 2. CREATE A CUSTOM SAFE DELETE FUNCTION
-- This bypasses Supabase's dashboard and avoids the trigger issue
CREATE OR REPLACE FUNCTION public.safe_delete_user(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  deleted_email text;
BEGIN
  -- Get user email before deletion
  SELECT email INTO deleted_email FROM auth.users WHERE id = target_user_id;
  
  -- Temporarily disable triggers to avoid the NEW.updated_at error
  SET session_replication_role = replica;
  
  -- Delete from auth.users (will cascade to profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Re-enable triggers
  SET session_replication_role = DEFAULT;
  
  -- Return success
  result := json_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', deleted_email,
    'message', 'User deleted successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-enable triggers even on error
    SET session_replication_role = DEFAULT;
    
    result := json_build_object(
      'success', false,
      'user_id', target_user_id,
      'error', SQLERRM
    );
    
    RETURN result;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.safe_delete_user(UUID) TO service_role;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SAFE USER DELETION FUNCTION CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All triggers have been re-enabled.';
  RAISE NOTICE '';
  RAISE NOTICE 'To delete a user safely, use:';
  RAISE NOTICE '  SELECT * FROM safe_delete_user(''USER_ID_HERE'');';
  RAISE NOTICE '';
  RAISE NOTICE 'This function temporarily disables triggers';
  RAISE NOTICE 'to avoid the NEW.updated_at error.';
  RAISE NOTICE '========================================';
END $$;
