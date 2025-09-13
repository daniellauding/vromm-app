-- =====================================================
-- CREATE DELETE ACCOUNT RPC FUNCTION
-- =====================================================
-- This creates the missing process_user_account_deletion function
-- Run this in your Supabase SQL editor

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS process_user_account_deletion(uuid,boolean,boolean,boolean,boolean,boolean,uuid);

-- Now create the new function
CREATE OR REPLACE FUNCTION process_user_account_deletion(
  p_user_id UUID,
  p_delete_private_routes BOOLEAN DEFAULT FALSE,
  p_delete_public_routes BOOLEAN DEFAULT FALSE,
  p_delete_events BOOLEAN DEFAULT FALSE,
  p_delete_exercises BOOLEAN DEFAULT FALSE,
  p_delete_reviews BOOLEAN DEFAULT FALSE,
  p_transfer_public_to UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  deleted_count INTEGER := 0;
  transferred_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Delete private routes if requested
    IF p_delete_private_routes THEN
      DELETE FROM routes 
      WHERE creator_id = p_user_id AND is_public = FALSE;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;

    -- Delete or transfer public routes
    IF p_delete_public_routes THEN
      IF p_transfer_public_to IS NOT NULL THEN
        -- Transfer public routes to system account
        UPDATE routes 
        SET creator_id = p_transfer_public_to,
            updated_at = NOW()
        WHERE creator_id = p_user_id AND is_public = TRUE;
        GET DIAGNOSTICS transferred_count = ROW_COUNT;
      ELSE
        -- Delete public routes
        DELETE FROM routes 
        WHERE creator_id = p_user_id AND is_public = TRUE;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        deleted_count := deleted_count + temp_count;
      END IF;
    ELSIF p_transfer_public_to IS NOT NULL THEN
      -- Transfer public routes even if not deleting
      UPDATE routes 
      SET creator_id = p_transfer_public_to,
          updated_at = NOW()
      WHERE creator_id = p_user_id AND is_public = TRUE;
      GET DIAGNOSTICS transferred_count = ROW_COUNT;
    END IF;

    -- Delete events if requested
    IF p_delete_events THEN
      DELETE FROM events WHERE creator_id = p_user_id;
    END IF;

    -- Delete exercises if requested
    IF p_delete_exercises THEN
      DELETE FROM learning_path_exercise_completions WHERE user_id = p_user_id;
    END IF;

    -- Delete reviews if requested
    IF p_delete_reviews THEN
      DELETE FROM reviews WHERE user_id = p_user_id;
    END IF;

    -- Delete saved routes (check if table exists and has user_id column)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_routes' AND table_schema = 'public') THEN
      DELETE FROM saved_routes WHERE user_id = p_user_id;
    END IF;

    -- Delete driven routes (check if table exists and has user_id column)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driven_routes' AND table_schema = 'public') THEN
      DELETE FROM driven_routes WHERE user_id = p_user_id;
    END IF;

    -- Delete comments (always delete user's comments, check if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments' AND table_schema = 'public') THEN
      DELETE FROM comments WHERE user_id = p_user_id;
    END IF;

    -- Mark account as deleted (don't actually delete the profile)
    UPDATE profiles 
    SET 
      account_status = 'deleted',
      updated_at = NOW(),
      -- Anonymize personal data
      full_name = 'Deleted User',
      email = 'deleted@example.com',
      avatar_url = NULL,
      location = NULL,
      location_lat = NULL,
      location_lng = NULL,
      organization_number = NULL,
      school_id = NULL,
      stripe_customer_id = NULL,
      apple_customer_id = NULL
    WHERE id = p_user_id;

    -- Build result
    result := json_build_object(
      'success', TRUE,
      'user_id', p_user_id,
      'deleted_routes', deleted_count,
      'transferred_routes', transferred_count,
      'account_status', 'deleted',
      'message', 'Account successfully deleted'
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on error
      result := json_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'message', 'Failed to delete account'
      );
      RETURN result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_user_account_deletion TO authenticated;

-- =====================================================
-- VERIFY FUNCTION WAS CREATED
-- =====================================================
SELECT 
  routine_name,
  routine_type,
  data_type,
  '✅ Function Created Successfully' as status
FROM information_schema.routines 
WHERE routine_name = 'process_user_account_deletion'
AND routine_schema = 'public';

-- =====================================================
-- TEST THE FUNCTION (OPTIONAL - FOR TESTING ONLY)
-- =====================================================
-- Uncomment the lines below to test the function with a test user
-- WARNING: This will actually delete the test user!

/*
-- Create a test user first
INSERT INTO profiles (id, full_name, email, role, account_status)
VALUES (
  'test-delete-user-456',
  'Test Delete User',
  'test-delete-456@example.com',
  'student',
  'active'
);

-- Test the function
SELECT process_user_account_deletion(
  'test-delete-user-456'::uuid,
  true,  -- delete private routes
  true,  -- delete public routes  
  true,  -- delete events
  true,  -- delete exercises
  true,  -- delete reviews
  '22f2bccb-efb5-4f67-85fd-8078a25acebc'::uuid  -- transfer to system
);

-- Check if user was marked as deleted
SELECT id, full_name, email, account_status 
FROM profiles 
WHERE id = 'test-delete-user-456';
*/
