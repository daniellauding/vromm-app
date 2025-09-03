-- Simple script to add developer_mode column to profiles table
-- Copy and paste this into Supabase SQL Editor

-- Add developer_mode column with default true (for testing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS developer_mode BOOLEAN DEFAULT true;

-- Update all existing users to have developer mode enabled
UPDATE profiles SET developer_mode = true WHERE developer_mode IS NULL;

-- Verify the column was added
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN developer_mode = true THEN 1 END) as developer_mode_enabled
FROM profiles;
