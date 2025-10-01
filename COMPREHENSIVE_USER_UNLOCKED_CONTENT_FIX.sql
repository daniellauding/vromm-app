-- Comprehensive fix for user_unlocked_content table
-- This script will ensure all required columns exist

-- Check current table structure
SELECT 
    'Current user_unlocked_content table structure:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_unlocked_content' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Create the table if it doesn't exist, or add missing columns
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'user_unlocked_content' 
        AND table_schema = 'public'
    ) THEN
        -- Create the table
        CREATE TABLE user_unlocked_content (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content_type VARCHAR(50) NOT NULL,
            content_id UUID NOT NULL,
            unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            unlock_method VARCHAR(50) DEFAULT 'password',
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created user_unlocked_content table';
    ELSE
        RAISE NOTICE 'user_unlocked_content table already exists';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_unlocked_content' 
        AND column_name = 'unlock_method'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_unlocked_content 
        ADD COLUMN unlock_method VARCHAR(50) DEFAULT 'password';
        RAISE NOTICE 'Added unlock_method column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_unlocked_content' 
        AND column_name = 'expires_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_unlocked_content 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added expires_at column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_unlocked_content' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_unlocked_content 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Update existing records with default values
    UPDATE user_unlocked_content 
    SET unlock_method = 'password' 
    WHERE unlock_method IS NULL;
    
    RAISE NOTICE 'Updated existing records with default unlock_method';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_content_user_id 
ON user_unlocked_content(user_id);

CREATE INDEX IF NOT EXISTS idx_user_unlocked_content_content 
ON user_unlocked_content(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_user_unlocked_content_unlocked_at 
ON user_unlocked_content(unlocked_at);

-- Add RLS policies if they don't exist
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE user_unlocked_content ENABLE ROW LEVEL SECURITY;
    
    -- Policy for users to see their own unlocked content
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_unlocked_content' 
        AND policyname = 'Users can view their own unlocked content'
    ) THEN
        CREATE POLICY "Users can view their own unlocked content" 
        ON user_unlocked_content FOR SELECT 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Added RLS policy for SELECT';
    END IF;
    
    -- Policy for users to insert their own unlocked content
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_unlocked_content' 
        AND policyname = 'Users can insert their own unlocked content'
    ) THEN
        CREATE POLICY "Users can insert their own unlocked content" 
        ON user_unlocked_content FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Added RLS policy for INSERT';
    END IF;
    
    -- Policy for users to update their own unlocked content
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_unlocked_content' 
        AND policyname = 'Users can update their own unlocked content'
    ) THEN
        CREATE POLICY "Users can update their own unlocked content" 
        ON user_unlocked_content FOR UPDATE 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Added RLS policy for UPDATE';
    END IF;
    
    -- Policy for users to delete their own unlocked content
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_unlocked_content' 
        AND policyname = 'Users can delete their own unlocked content'
    ) THEN
        CREATE POLICY "Users can delete their own unlocked content" 
        ON user_unlocked_content FOR DELETE 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Added RLS policy for DELETE';
    END IF;
END $$;

-- Final verification
SELECT 
    'Final user_unlocked_content table structure:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_unlocked_content' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data if any exists
SELECT 'Sample data from user_unlocked_content:' as info;
SELECT * FROM user_unlocked_content LIMIT 5;
