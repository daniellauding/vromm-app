-- TEST YOUR LOCATION FIX
-- Copy-paste this to verify the ProfileScreen location fix works

-- Check your user's location data from onboarding
SELECT 
  id,
  email,
  full_name,
  
  -- Legacy location fields
  location as legacy_location,
  location_lat as legacy_lat,
  location_lng as legacy_lng,
  
  -- NEW: Onboarding location fields (what ProfileScreen now reads)
  preferred_city as onboarding_location,
  preferred_city_coords as onboarding_coords,
  
  -- Show which one ProfileScreen will use:
  CASE 
    WHEN preferred_city IS NOT NULL AND preferred_city != '' 
    THEN '✅ Will show: ' || preferred_city || ' (from onboarding)'
    WHEN location IS NOT NULL AND location != '' 
    THEN '✅ Will show: ' || location || ' (legacy)'
    ELSE '❌ Will show: Not specified'
  END as profilescreen_will_display,
  
  interactive_onboarding_completed,
  created_at,
  updated_at

FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',  -- daniel+skaparny  
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'   -- daniel+freshkonto
);

-- Also verify the coordinates are properly structured
SELECT 
  email,
  preferred_city,
  preferred_city_coords,
  preferred_city_coords->>'latitude' as extracted_latitude,
  preferred_city_coords->>'longitude' as extracted_longitude
FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'
);
