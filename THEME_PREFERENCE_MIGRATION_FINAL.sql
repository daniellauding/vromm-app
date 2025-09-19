-- Add theme_preference column to profiles table
-- This fixes the error: "Could not find the 'theme_preference' column of 'profiles' in the schema cache"

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' 
CHECK (theme_preference IN ('system', 'light', 'dark'));

-- Update existing profiles to have 'system' as default if they don't have it
UPDATE profiles 
SET theme_preference = 'system' 
WHERE theme_preference IS NULL;
