-- Fix experience_level enum to include all values
-- Copy-paste this to Supabase SQL Editor

-- Add missing enum values
DO $$ 
BEGIN
  -- Add 'expert' if it doesn't exist
  BEGIN
    ALTER TYPE experience_level ADD VALUE IF NOT EXISTS 'expert';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  -- Add 'refresher' if it doesn't exist  
  BEGIN
    ALTER TYPE experience_level ADD VALUE IF NOT EXISTS 'refresher';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Verify enum values
SELECT enumlabel as valid_experience_levels
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'experience_level'
)
ORDER BY enumlabel;
