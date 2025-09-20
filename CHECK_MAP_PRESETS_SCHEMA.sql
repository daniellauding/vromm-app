-- CHECK MAP_PRESETS TABLE SCHEMA

-- 1. Check the structure of map_presets table
SELECT 'Map presets table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what columns actually exist
SELECT 'Available columns in map_presets:' as info;
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
  AND table_schema = 'public';
