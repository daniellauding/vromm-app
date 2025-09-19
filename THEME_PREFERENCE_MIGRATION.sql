-- Add theme_preference column to profiles table
-- This allows users to manually override system theme settings

-- Add the theme_preference column with default 'system'
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' 
CHECK (theme_preference IN ('system', 'light', 'dark'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference 
ON profiles(theme_preference);

-- Add comment to document the column
COMMENT ON COLUMN profiles.theme_preference IS 'User theme preference: system (follow device), light (force light), dark (force dark)';
