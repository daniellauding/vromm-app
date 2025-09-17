-- CHECK: What does the new user profile look like?

-- 1. Check the new user's profile
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE id = 'a94f755d-288c-49f9-b92b-d092a93ea8b1';

-- 2. Check if the user has any map presets
SELECT 
    id,
    name,
    description,
    creator_id,
    is_default,
    created_at
FROM public.map_presets 
WHERE creator_id = 'a94f755d-288c-49f9-b92b-d092a93ea8b1';

-- 3. Check if our function created any presets
SELECT 
    id,
    name,
    description,
    creator_id,
    is_default,
    created_at
FROM public.map_presets 
WHERE creator_id = 'a94f755d-288c-49f9-b92b-d092a93ea8b1'
AND name = 'All Routes';
