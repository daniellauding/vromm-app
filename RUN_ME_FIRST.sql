-- ============================================
-- RUN THIS FIRST - ONE-TIME SETUP
-- Fixes all trigger issues before running other scripts
-- ============================================

-- Fix all updated_at trigger functions to handle DELETE operations
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chat_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_relationship_review_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tour_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Create/recreate the safe_delete_user function
CREATE OR REPLACE FUNCTION public.safe_delete_user(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  deleted_email text;
BEGIN
  SELECT email INTO deleted_email FROM auth.users WHERE id = target_user_id;
  
  SET session_replication_role = replica;
  DELETE FROM auth.users WHERE id = target_user_id;
  SET session_replication_role = DEFAULT;
  
  result := json_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', deleted_email,
    'message', 'User deleted successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    SET session_replication_role = DEFAULT;
    result := json_build_object(
      'success', false,
      'user_id', target_user_id,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_delete_user(UUID) TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL FIXES APPLIED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ All updated_at triggers fixed';
  RAISE NOTICE '✓ safe_delete_user function created';
  RAISE NOTICE '✓ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now safely run:';
  RAISE NOTICE '  • CHECK_AND_FIX_EMAIL.sql';
  RAISE NOTICE '  • DELETE_MULTIPLE_USERS.sql';
  RAISE NOTICE '  • CHANGE_USER_EMAIL_AND_DISCONNECT_SOCIAL.sql';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

