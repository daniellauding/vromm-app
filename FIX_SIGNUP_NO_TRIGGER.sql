-- FIX: Handle signup without modifying auth.users trigger
-- Instead, we'll create a function that can be called from the client side

-- Drop any existing functions
DROP FUNCTION IF EXISTS public.handle_new_user_invitation() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT) CASCADE;

-- Create a function that can be called from the client after signup
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    user_id,
    COALESCE(user_name, user_email),
    user_email,
    'student',
    NOW(),
    NOW()
  );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'user_id', user_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's okay
    result := json_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', user_id
    );
    RETURN result;
    
  WHEN OTHERS THEN
    -- Log the error and return failure
    result := json_build_object(
      'success', false,
      'message', 'Failed to create profile: ' || SQLERRM,
      'user_id', user_id
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- Create a simple RPC function for easier client calls
CREATE OR REPLACE FUNCTION public.setup_new_user()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  current_user_name TEXT;
  result JSON;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_email := auth.email();
  
  -- Get user name from metadata if available
  SELECT raw_user_meta_data->>'full_name' INTO current_user_name
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Call the profile creation function
  SELECT public.create_user_profile(current_user_id, current_user_email, current_user_name) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_new_user() TO authenticated;
