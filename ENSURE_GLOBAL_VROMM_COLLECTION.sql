-- Ensure Global VROMM Collection Exists
-- This script creates the global VROMM collection if it doesn't exist
-- Copy and paste this into your Supabase SQL editor

-- Check if global VROMM collection exists, if not create it
INSERT INTO map_presets (
  id,
  name, 
  description, 
  visibility, 
  is_default, 
  allow_public_edit, 
  creator_id, 
  created_at, 
  updated_at
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, -- Fixed UUID for global collection
  'VROMM',
  'Global collection shared by all VROMM users worldwide',
  'public',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user ID
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM map_presets 
  WHERE name = 'VROMM' AND is_default = true
);

-- Update any existing VROMM collection to ensure it has the correct properties
UPDATE map_presets 
SET 
  description = 'Global collection shared by all VROMM users worldwide',
  visibility = 'public',
  is_default = true,
  allow_public_edit = true,
  updated_at = NOW()
WHERE name = 'VROMM' AND is_default = true;

-- Verify the global collection exists
SELECT 
  id,
  name,
  description,
  visibility,
  is_default,
  allow_public_edit,
  creator_id,
  created_at
FROM map_presets 
WHERE name = 'VROMM' AND is_default = true;
