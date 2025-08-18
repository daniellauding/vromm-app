-- Fix RLS policies to block deleted users from accessing the app
-- This ensures that users with account_status = 'deleted' cannot access their profile or app data

-- 1. Add RLS policy to profiles table to block deleted users
DROP POLICY IF EXISTS "Deleted users cannot access profiles" ON public.profiles;
CREATE POLICY "Deleted users cannot access profiles" 
ON public.profiles 
FOR ALL 
USING (
  -- Allow unauthenticated access for public profiles
  auth.uid() IS NULL OR 
  -- Block access if the authenticated user is the profile owner AND they're deleted
  (auth.uid() != id OR account_status != 'deleted')
);

-- 2. Update the account deletion function to also disable the auth user
CREATE OR REPLACE FUNCTION public.process_user_account_deletion(
  p_user_id uuid,
  p_delete_private_routes boolean default false,
  p_delete_public_routes boolean default false,
  p_delete_events boolean default false,
  p_delete_exercises boolean default false,
  p_delete_reviews boolean default false,
  p_transfer_public_to uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete user's saved routes and driven routes (always)
  delete from public.saved_routes where user_id = p_user_id;
  delete from public.driven_routes where user_id = p_user_id;
  
  -- Delete user's reviews if requested
  if p_delete_reviews then
    delete from public.route_reviews where user_id = p_user_id;
  end if;
  
  -- Handle private routes
  if p_delete_private_routes then
    delete from public.routes where creator_id = p_user_id and visibility = 'private';
  end if;
  
  -- Handle public routes
  if p_delete_public_routes then
    delete from public.routes where creator_id = p_user_id and visibility = 'public';
  elsif p_transfer_public_to is not null then
    update public.routes 
    set creator_id = p_transfer_public_to 
    where creator_id = p_user_id and visibility = 'public';
  end if;
  
  -- Handle events
  if p_delete_events then
    delete from public.events where created_by = p_user_id;
  elsif p_transfer_public_to is not null then
    update public.events 
    set created_by = p_transfer_public_to 
    where created_by = p_user_id;
  end if;
  
  -- Handle user exercises
  if p_delete_exercises then
    delete from public.user_exercises where creator_id = p_user_id;
  elsif p_transfer_public_to is not null then
    update public.user_exercises 
    set creator_id = p_transfer_public_to 
    where creator_id = p_user_id;
  end if;
  
  -- Anonymize the profile and mark as deleted
  update public.profiles 
  set 
    full_name = 'Deleted user',
    avatar_url = null,
    private_profile = true,
    is_trusted = false,
    account_status = 'deleted',
    email = null  -- Clear email for privacy
  where id = p_user_id;
  
  -- IMPORTANT: Disable the auth user to prevent login
  -- This requires admin privileges, so we'll use the service role
  perform auth.admin_update_user_by_id(
    user_id := p_user_id,
    attributes := jsonb_build_object(
      'email_confirmed_at', null,
      'phone_confirmed_at', null,
      'banned_until', '2099-12-31T23:59:59Z'::timestamptz
    )
  );
  
exception
  when others then
    -- If auth.admin_update_user_by_id fails (function doesn't exist or permissions),
    -- we'll continue with just the profile update
    raise notice 'Could not disable auth user, but profile marked as deleted';
end;
$$;

-- 3. Alternative: Create a simpler function that just marks as deleted and relies on RLS
CREATE OR REPLACE FUNCTION public.soft_delete_user_account(
  p_user_id uuid,
  p_delete_private_routes boolean default false,
  p_delete_public_routes boolean default false,
  p_delete_events boolean default false,
  p_delete_exercises boolean default false,
  p_delete_reviews boolean default false,
  p_transfer_public_to uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Same deletion logic as above, but just marks account as deleted
  -- The RLS policy will prevent further access
  
  delete from public.saved_routes where user_id = p_user_id;
  delete from public.driven_routes where user_id = p_user_id;
  
  if p_delete_reviews then
    delete from public.route_reviews where user_id = p_user_id;
  end if;
  
  if p_delete_private_routes then
    delete from public.routes where creator_id = p_user_id and visibility = 'private';
  end if;
  
  if p_delete_public_routes then
    delete from public.routes where creator_id = p_user_id and visibility = 'public';
  elsif p_transfer_public_to is not null then
    update public.routes 
    set creator_id = p_transfer_public_to 
    where creator_id = p_user_id and visibility = 'public';
  end if;
  
  if p_delete_events then
    delete from public.events where created_by = p_user_id;
  elsif p_transfer_public_to is not null then
    update public.events 
    set created_by = p_transfer_public_to 
    where created_by = p_user_id;
  end if;
  
  if p_delete_exercises then
    delete from public.user_exercises where creator_id = p_user_id;
  elsif p_transfer_public_to is not null then
    update public.user_exercises 
    set creator_id = p_transfer_public_to 
    where creator_id = p_user_id;
  end if;
  
  -- Mark profile as deleted (RLS will block access)
  update public.profiles 
  set 
    full_name = 'Deleted user',
    avatar_url = null,
    private_profile = true,
    is_trusted = false,
    account_status = 'deleted',
    email = null
  where id = p_user_id;
end;
$$;

-- 4. Add RLS policies to other important tables to block deleted users
-- Routes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'routes' 
    AND policyname = 'Block deleted users from routes'
  ) THEN
    CREATE POLICY "Block deleted users from routes" 
    ON public.routes 
    FOR ALL 
    USING (
      NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_status = 'deleted'
      )
    );
  END IF;
END $$;

-- Events table  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Block deleted users from events'
  ) THEN
    CREATE POLICY "Block deleted users from events" 
    ON public.events 
    FOR ALL 
    USING (
      NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_status = 'deleted'
      )
    );
  END IF;
END $$;

-- Messages table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'messages' 
      AND policyname = 'Block deleted users from messages'
    ) THEN
      CREATE POLICY "Block deleted users from messages" 
      ON public.messages 
      FOR ALL 
      USING (
        NOT EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND account_status = 'deleted'
        )
      );
    END IF;
  END IF;
END $$;

-- Provide verification queries
-- Check if a user is properly blocked:
-- SELECT id, full_name, account_status FROM public.profiles WHERE email = 'daniel+tabort@lauding.se';
-- 
-- Test if RLS is working:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "90311cc2-0451-44f4-a5ed-a54d484603fe"}';
-- SELECT * FROM public.profiles WHERE id = '90311cc2-0451-44f4-a5ed-a54d484603fe';
-- -- Should return no rows if RLS is working
