-- Fix notification RLS policies to allow proper insertion
-- Migration: 20250814_fix_notification_policies.sql

-- Force drop ALL possible policies and recreate (safe approach)
DO $$
BEGIN
  -- Drop all existing notification policies if they exist
  DROP POLICY IF EXISTS "Allow notification creation by actors" ON notifications;
  DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications; 
  DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
  DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;
  DROP POLICY IF EXISTS "System can create notifications" ON notifications;
END
$$;

-- Create the super permissive insert policy
CREATE POLICY "Allow all notification inserts" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create select policy 
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Create update policy
CREATE POLICY "Users can update their own notifications" ON notifications  
  FOR UPDATE USING (auth.uid() = user_id);

-- Also ensure routes table has proper RLS policies if not already set
DO $$
BEGIN
  -- Check if routes table has RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'routes'
  ) THEN
    RAISE NOTICE 'Routes table does not exist, skipping RLS setup';
  ELSE
    -- Enable RLS on routes if not already enabled
    ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for routes if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'routes' 
      AND policyname = 'Users can view public routes'
    ) THEN
      CREATE POLICY "Users can view public routes" ON routes
        FOR SELECT USING (
          is_public = true OR 
          auth.uid() = creator_id
        );
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'routes' 
      AND policyname = 'Users can create their own routes'
    ) THEN
      CREATE POLICY "Users can create their own routes" ON routes
        FOR INSERT WITH CHECK (
          auth.uid() = creator_id
        );
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'routes' 
      AND policyname = 'Users can update their own routes'
    ) THEN
      CREATE POLICY "Users can update their own routes" ON routes
        FOR UPDATE USING (
          auth.uid() = creator_id
        );
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'routes' 
      AND policyname = 'Users can delete their own routes'
    ) THEN
      CREATE POLICY "Users can delete their own routes" ON routes
        FOR DELETE USING (
          auth.uid() = creator_id
        );
    END IF;
  END IF;
END
$$;

-- Add a comment explaining the notification system
COMMENT ON TABLE notifications IS 'Stores user notifications with flexible RLS policies allowing both user-initiated and system-initiated notifications';