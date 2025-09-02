-- VERIFY YOUR USER DATA
-- Copy-paste this SQL to check if onboarding data is properly saved

-- 1. CHECK YOUR USER'S COMPLETE ONBOARDING DATA
-- =============================================
SELECT 
  id,
  email,
  role,
  role_confirmed,
  full_name,
  
  -- Direct profile fields from onboarding
  vehicle_type,
  transmission_type,
  license_type,
  experience_level,
  target_license_date,
  preferred_city,
  preferred_city_coords,
  
  -- Completion flags
  license_plan_completed,
  interactive_onboarding_completed,
  interactive_onboarding_version,
  
  -- JSON backup data
  license_plan_data,
  
  created_at,
  updated_at
FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',  -- daniel+skaparny
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'   -- daniel+freshkonto
);

-- 2. CHECK IF EXPERIENCE LEVEL MAPPING WORKED
-- ===========================================
-- Should show: selected "expert" → saved as "advanced"
SELECT 
  id,
  email,
  experience_level as saved_experience_level,
  license_plan_data->>'experience_level' as original_selection,
  
  CASE 
    WHEN license_plan_data->>'experience_level' = 'expert' AND experience_level = 'advanced' 
    THEN '✅ MAPPING WORKED: expert → advanced'
    WHEN license_plan_data->>'experience_level' = experience_level 
    THEN '✅ DIRECT MATCH: ' || experience_level
    ELSE '❌ MISMATCH: JSON=' || (license_plan_data->>'experience_level') || ' DB=' || experience_level
  END as mapping_status
FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
);

-- 3. CHECK INVITATIONS/CONNECTIONS SENT
-- =====================================
SELECT 
  'PENDING INVITATIONS' as type,
  pi.email as target_email,
  pi.role as target_role,
  pi.invited_by,
  pi.status,
  pi.metadata->>'customMessage' as custom_message,
  pi.created_at
FROM pending_invitations pi
WHERE pi.invited_by IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
)

UNION ALL

SELECT 
  'NOTIFICATIONS SENT' as type,
  (SELECT email FROM profiles WHERE id = n.user_id) as target_email,
  n.type as target_role,
  n.actor_id as invited_by,
  'sent' as status,
  n.metadata->>'customMessage' as custom_message,
  n.created_at
FROM notifications n
WHERE n.actor_id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
)
ORDER BY created_at DESC;

-- 4. VERIFY COMPLETION FLAGS
-- ==========================
SELECT 
  id,
  email,
  role,
  
  -- Check what should be completed vs what is
  CASE 
    WHEN role_confirmed = true THEN '✅ Role confirmed'
    ELSE '❌ Role not confirmed'
  END as role_status,
  
  CASE 
    WHEN license_plan_completed = true THEN '✅ License plan completed'
    ELSE '❌ License plan not completed'
  END as license_status,
  
  CASE 
    WHEN interactive_onboarding_completed = true THEN '✅ Interactive onboarding completed'
    ELSE '❌ Interactive onboarding not completed'
  END as onboarding_status,
  
  CASE 
    WHEN preferred_city IS NOT NULL THEN '✅ Location saved: ' || preferred_city
    ELSE '❌ No location saved'
  END as location_status

FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
);

-- 5. FIX INTERACTIVE_ONBOARDING_COMPLETED FLAG
-- ============================================
-- Run this if interactive_onboarding_completed shows as false
UPDATE profiles 
SET 
  interactive_onboarding_completed = true,
  interactive_onboarding_version = 2
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
)
AND (interactive_onboarding_completed = false OR interactive_onboarding_version < 2);

-- Verify the fix worked
SELECT 
  id,
  email,
  interactive_onboarding_completed,
  interactive_onboarding_version,
  updated_at
FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
);
