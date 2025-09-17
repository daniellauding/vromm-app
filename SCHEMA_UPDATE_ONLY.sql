-- Schema Update Only - Add allow_public_edit column to map_presets
-- Copy and paste this into your Supabase SQL editor

-- Add allow_public_edit column to map_presets table
ALTER TABLE map_presets 
ADD COLUMN IF NOT EXISTS allow_public_edit BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN map_presets.allow_public_edit IS 'Whether public collections allow editing by all users (not just the creator)';

-- Update existing public collections to have allow_public_edit = false by default
UPDATE map_presets 
SET allow_public_edit = FALSE 
WHERE visibility = 'public' AND allow_public_edit IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
AND column_name = 'allow_public_edit';
