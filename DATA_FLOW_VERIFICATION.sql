-- ========================================
-- DATA FLOW VERIFICATION QUERIES
-- Run these to verify onboarding data is properly saved and accessible
-- ========================================

-- 1. CHECK PROFILE TABLE COLUMNS EXIST
-- =====================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN (
    'vehicle_type', 'transmission_type', 'license_type', 'experience_level',
    'target_license_date', 'role_confirmed', 'preferred_city', 'preferred_city_coords',
    'interactive_onboarding_completed', 'interactive_onboarding_version', 'license_plan_data'
  )
ORDER BY column_name;

-- 2. CHECK USER'S ONBOARDING DATA (Replace with actual email)
-- ===========================================================
SELECT 
  id,
  email,
  role,
  role_confirmed,
  vehicle_type,
  transmission_type,
  license_type,
  experience_level,
  target_license_date,
  preferred_city,
  preferred_city_coords,
  license_plan_data,
  license_plan_completed,
  interactive_onboarding_completed,
  interactive_onboarding_version,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your test email
LIMIT 1;

-- 3. CHECK LEARNING PATH CATEGORIES FOR EXPERIENCE LEVELS
-- =======================================================
SELECT 
  category,
  value,
  label,
  order_index,
  is_default,
  created_at
FROM learning_path_categories 
WHERE category = 'experience_level'
ORDER BY order_index;

-- 4. VERIFY ENUM VALUES MATCH DATABASE
-- ====================================
SELECT 
  enumlabel as valid_experience_levels
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'experience_level'
);

-- 5. CHECK RECENT ONBOARDING COMPLETIONS
-- ======================================
SELECT 
  p.email,
  p.role,
  p.experience_level,
  p.vehicle_type,
  p.interactive_onboarding_completed,
  p.updated_at
FROM profiles p 
WHERE p.interactive_onboarding_completed = true
ORDER BY p.updated_at DESC
LIMIT 5;
