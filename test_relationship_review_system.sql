-- Test the complete relationship review system

-- 1. First, let's verify the table and constraints are working
SELECT 
  'relationship_reviews table' as component,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relationship_reviews') 
    THEN 'EXISTS ✅' ELSE 'MISSING ❌' END as status

UNION ALL

SELECT 
  'unique constraint',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_pending_invitation_per_relationship') 
    THEN 'APPLIED ✅' ELSE 'MISSING ❌' END

UNION ALL

SELECT 
  'rating functions',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_supervisor_average_rating') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END;

-- 2. Check current relationships that can be reviewed
SELECT 
  'Active supervisor-student relationships' as info,
  COUNT(*)::text as value
FROM supervisor_student_relationships;

-- 3. Check current invitation status (should be clean now)
SELECT 
  status,
  COUNT(*) as count
FROM pending_invitations
GROUP BY status
ORDER BY status;

-- 4. Test creating a sample review (REPLACE USER IDs WITH REAL ONES)
-- This is just an example - don't run unless you have real user IDs
/*
INSERT INTO relationship_reviews (
  student_id, 
  supervisor_id, 
  reviewer_id, 
  rating, 
  content, 
  review_type,
  is_anonymous
) VALUES (
  'STUDENT_USER_ID_HERE',      -- Replace with real student ID
  'SUPERVISOR_USER_ID_HERE',   -- Replace with real supervisor ID  
  'REVIEWER_USER_ID_HERE',     -- Replace with real reviewer ID (same as student or supervisor)
  5,
  'Excellent supervisor! Very helpful and professional.',
  'student_reviews_supervisor', -- or 'supervisor_reviews_student'
  false
);
*/

-- 5. Test getting average rating for a user (REPLACE WITH REAL USER ID)
/*
SELECT get_supervisor_average_rating('SUPERVISOR_USER_ID_HERE') as supervisor_avg_rating;
SELECT get_student_average_rating('STUDENT_USER_ID_HERE') as student_avg_rating;
*/

-- 6. Get all users who can potentially be reviewed (have relationships)
SELECT DISTINCT
  p.id,
  p.full_name,
  p.email,
  p.role,
  'Can be reviewed' as status
FROM profiles p
WHERE p.id IN (
  SELECT student_id FROM supervisor_student_relationships
  UNION
  SELECT supervisor_id FROM supervisor_student_relationships
)
ORDER BY p.role, p.full_name;

-- 7. Show current review statistics
SELECT 
  'Total reviews' as metric,
  COUNT(*)::text as value
FROM relationship_reviews

UNION ALL

SELECT 
  'Average rating across platform',
  ROUND(AVG(rating), 2)::text
FROM relationship_reviews

UNION ALL

SELECT 
  'Student reviews of supervisors',
  COUNT(*)::text
FROM relationship_reviews
WHERE review_type = 'student_reviews_supervisor'

UNION ALL

SELECT 
  'Supervisor reviews of students', 
  COUNT(*)::text
FROM relationship_reviews
WHERE review_type = 'supervisor_reviews_student';
