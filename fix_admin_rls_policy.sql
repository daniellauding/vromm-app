-- Fix RLS policy to allow admins to view all relationships
-- This will allow admin users to see all relationships in the admin panel

-- Add admin policy for student_supervisor_relationships
CREATE POLICY "Admins can view all relationships" 
  ON public.student_supervisor_relationships 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify the policy was created
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

-- Test the admin access
-- This should now return all relationships for admin users
SELECT 
  ssr.id,
  ssr.student_id,
  student.full_name as student_name,
  ssr.supervisor_id,
  supervisor.full_name as supervisor_name,
  ssr.status,
  ssr.created_at
FROM student_supervisor_relationships ssr
JOIN profiles student ON student.id = ssr.student_id
JOIN profiles supervisor ON supervisor.id = ssr.supervisor_id
ORDER BY ssr.created_at DESC;
