-- Fix user_unlocked_content table schema
-- Add missing unlock_method column

-- First, let's check the current schema of user_unlocked_content
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_unlocked_content' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add the missing unlock_method column if it doesn't exist
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_unlocked_content' 
        AND column_name = 'unlock_method'
        AND table_schema = 'public'
    ) THEN
        -- Add the unlock_method column
        ALTER TABLE user_unlocked_content 
        ADD COLUMN unlock_method VARCHAR(50) DEFAULT 'password';
        
        RAISE NOTICE 'Added unlock_method column to user_unlocked_content table';
    ELSE
        RAISE NOTICE 'unlock_method column already exists in user_unlocked_content table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_unlocked_content' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Update existing records to have a default unlock_method if they don't have one
UPDATE user_unlocked_content 
SET unlock_method = 'password' 
WHERE unlock_method IS NULL;

-- Show the updated table structure
SELECT * FROM user_unlocked_content LIMIT 5;
