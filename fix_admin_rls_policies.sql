-- Fix RLS policies to allow admins to manage all relationships
-- This will allow admin users to create, update, and delete relationships in the admin panel

-- Add admin policy for INSERT operations on student_supervisor_relationships
CREATE POLICY "Admins can insert all relationships" 
  ON public.student_supervisor_relationships 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add admin policy for UPDATE operations on student_supervisor_relationships
CREATE POLICY "Admins can update all relationships" 
  ON public.student_supervisor_relationships 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add admin policy for DELETE operations on student_supervisor_relationships
CREATE POLICY "Admins can delete all relationships" 
  ON public.student_supervisor_relationships 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify all policies for student_supervisor_relationships
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'student_supervisor_relationships'
ORDER BY policyname;

-- Test admin access for all operations
-- This should now work for admin users
SELECT 
  'Admin policies added successfully' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'student_supervisor_relationships';
