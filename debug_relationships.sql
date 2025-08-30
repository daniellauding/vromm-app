-- Debug relationships for onboarding connection issue
-- Copy and paste this to check what relationships exist

-- 1. Check all existing relationships for the current user
-- Replace 'YOUR_USER_ID' with the actual user ID from the logs
SELECT 
  r.id,
  r.student_id,
  r.supervisor_id,
  r.status,
  r.created_at,
  student.full_name as student_name,
  student.email as student_email,
  supervisor.full_name as supervisor_name,
  supervisor.email as supervisor_email
FROM student_supervisor_relationships r
LEFT JOIN profiles student ON student.id = r.student_id
LEFT JOIN profiles supervisor ON supervisor.id = r.supervisor_id
WHERE r.student_id = 'YOUR_USER_ID' OR r.supervisor_id = 'YOUR_USER_ID'
ORDER BY r.created_at DESC;

-- 2. Check for duplicate relationships (this is what's causing the error)
SELECT 
  student_id,
  supervisor_id,
  COUNT(*) as relationship_count,
  array_agg(id) as relationship_ids,
  array_agg(status) as statuses
FROM student_supervisor_relationships 
GROUP BY student_id, supervisor_id
HAVING COUNT(*) > 1;

-- 3. Check the unique constraint (this should exist)
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname LIKE '%student_supervisor_relationships%';

-- 4. Check if there are any NULL values that might cause issues
SELECT 
  COUNT(*) as total_relationships,
  COUNT(student_id) as non_null_students,
  COUNT(supervisor_id) as non_null_supervisors
FROM student_supervisor_relationships;

-- 5. Find the specific relationship that's causing the duplicate error
-- Replace with actual user IDs from the error
SELECT * FROM student_supervisor_relationships 
WHERE (student_id = 'STUDENT_ID_FROM_ERROR' AND supervisor_id = 'SUPERVISOR_ID_FROM_ERROR')
   OR (student_id = 'SUPERVISOR_ID_FROM_ERROR' AND supervisor_id = 'STUDENT_ID_FROM_ERROR');
