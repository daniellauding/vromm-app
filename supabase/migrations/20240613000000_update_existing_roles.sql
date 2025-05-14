-- Update profiles with non-default roles to have role_confirmed=true
-- This assumes that if the user has already set a specific role, they have confirmed it
UPDATE public.profiles 
SET role_confirmed = TRUE
WHERE 
  -- If role is anything other than the default 'student' role, consider it confirmed
  (role != 'student' OR 
   -- Or if the profile row was updated after creation (indicating user interaction)
   created_at != updated_at);

-- For specifically defined roles, set role_confirmed=true
UPDATE public.profiles
SET role_confirmed = TRUE
WHERE role IN ('teacher', 'instructor', 'school', 'admin');

-- Log the update for verification
SELECT COUNT(*) FROM public.profiles WHERE role_confirmed = TRUE; 