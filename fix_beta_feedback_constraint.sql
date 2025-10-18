-- Fix the beta_test_feedback table constraint to allow 'pricing' feedback type
-- Run this in your Supabase SQL Editor

-- Drop the existing check constraint
ALTER TABLE beta_test_feedback 
DROP CONSTRAINT IF EXISTS beta_test_feedback_feedback_type_check;

-- Add a new check constraint that includes 'pricing'
ALTER TABLE beta_test_feedback 
ADD CONSTRAINT beta_test_feedback_feedback_type_check 
CHECK (feedback_type IN ('general', 'bug', 'feature', 'pricing', 'ui', 'performance', 'other'));

-- Also ensure RLS is enabled
ALTER TABLE beta_test_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert feedback" ON beta_test_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON beta_test_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON beta_test_feedback;

-- Allow anyone to insert feedback (for beta testing)
CREATE POLICY "Anyone can insert feedback" 
ON beta_test_feedback 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON beta_test_feedback 
FOR SELECT 
TO authenticated
USING (
  metadata->>'userId' = auth.uid()::text
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON beta_test_feedback 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

