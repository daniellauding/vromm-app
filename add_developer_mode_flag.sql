-- Add developer mode flag to profiles table
-- This flag will control access to developer tools and testing features

-- Add the developer_mode column with default true for all users
-- Later this can be set to false for production users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS developer_mode BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN profiles.developer_mode IS 'Controls access to developer tools and testing features. Default true for testing, can be set to false for production users.';

-- Set all existing users to have developer mode enabled (for testing)
UPDATE profiles 
SET developer_mode = true 
WHERE developer_mode IS NULL;

-- Optional: Create an index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_developer_mode ON profiles(developer_mode) WHERE developer_mode = true;

-- Example queries to manage developer mode:
-- Enable developer mode for a specific user:
-- UPDATE profiles SET developer_mode = true WHERE email = 'user@example.com';

-- Disable developer mode for all users (production):
-- UPDATE profiles SET developer_mode = false;

-- Get all users with developer mode enabled:
-- SELECT id, full_name, email, developer_mode FROM profiles WHERE developer_mode = true;
