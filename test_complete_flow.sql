-- TEST THE COMPLETE FLOW
-- Copy and paste this to test the entire system

-- Step 1: See what invitations we have
SELECT 
  id,
  email,
  invited_by,
  status,
  created_at,
  (SELECT full_name FROM profiles WHERE id = invited_by) as inviter_name,
  (SELECT role FROM profiles WHERE id = invited_by) as inviter_role
FROM pending_invitations 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Step 2: Accept the first pending invitation (creates relationship automatically)
-- Get the first pending invitation ID
WITH first_invitation AS (
  SELECT id FROM pending_invitations 
  WHERE status = 'pending' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT accept_invitation_and_create_relationship(id) as invitation_accepted
FROM first_invitation;

-- Step 3: Check if relationship was created
SELECT 
  'After accepting invitation' as step,
  COUNT(*) as relationship_count
FROM supervisor_student_relationships;

-- Step 4: See the relationship details
SELECT 
  ssr.id,
  ssr.created_at,
  student.full_name as student_name,
  student.email as student_email,
  supervisor.full_name as supervisor_name,
  supervisor.email as supervisor_email,
  ssr.status
FROM supervisor_student_relationships ssr
JOIN profiles student ON ssr.student_id = student.id
JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
ORDER BY ssr.created_at DESC;

-- Step 5: Create a test review (student reviewing supervisor)
WITH test_relationship AS (
  SELECT 
    ssr.student_id,
    ssr.supervisor_id,
    ssr.student_id as reviewer_id  -- student is the reviewer
  FROM supervisor_student_relationships ssr
  LIMIT 1
)
INSERT INTO relationship_reviews (
  student_id, 
  supervisor_id, 
  reviewer_id, 
  rating, 
  content, 
  review_type,
  is_anonymous
)
SELECT 
  student_id,
  supervisor_id,
  reviewer_id,
  5,
  'Excellent supervisor! Very patient and knowledgeable. Highly recommend!',
  'student_reviews_supervisor',
  false
FROM test_relationship
ON CONFLICT (student_id, supervisor_id, reviewer_id) DO NOTHING;

-- Step 6: Create another test review (supervisor reviewing student)
WITH test_relationship AS (
  SELECT 
    ssr.student_id,
    ssr.supervisor_id,
    ssr.supervisor_id as reviewer_id  -- supervisor is the reviewer
  FROM supervisor_student_relationships ssr
  LIMIT 1
)
INSERT INTO relationship_reviews (
  student_id, 
  supervisor_id, 
  reviewer_id, 
  rating, 
  content, 
  review_type,
  is_anonymous
)
SELECT 
  student_id,
  supervisor_id,
  reviewer_id,
  4,
  'Great student! Very engaged and asks good questions. Pleasure to work with.',
  'supervisor_reviews_student',
  false
FROM test_relationship
ON CONFLICT (student_id, supervisor_id, reviewer_id) DO NOTHING;

-- Step 7: Check final results
SELECT 
  'FINAL RESULTS' as section,
  '' as details
UNION ALL
SELECT 
  'Total relationships',
  COUNT(*)::text
FROM supervisor_student_relationships
UNION ALL
SELECT 
  'Total reviews',
  COUNT(*)::text
FROM relationship_reviews
UNION ALL
SELECT 
  'Average rating across platform',
  ROUND(AVG(rating), 2)::text
FROM relationship_reviews;

-- Step 8: See reviews with details
SELECT 
  rr.rating,
  rr.content,
  rr.review_type,
  rr.is_anonymous,
  rr.created_at,
  student.full_name as student_name,
  supervisor.full_name as supervisor_name,
  reviewer.full_name as reviewer_name
FROM relationship_reviews rr
JOIN profiles student ON rr.student_id = student.id
JOIN profiles supervisor ON rr.supervisor_id = supervisor.id
JOIN profiles reviewer ON rr.reviewer_id = reviewer.id
ORDER BY rr.created_at DESC;

-- Step 9: Test the rating functions
SELECT 
  p.full_name,
  p.role,
  CASE 
    WHEN p.role IN ('instructor', 'supervisor') THEN 
      get_supervisor_average_rating(p.id)
    WHEN p.role = 'student' THEN 
      get_student_average_rating(p.id)
    ELSE 0
  END as average_rating
FROM profiles p
WHERE p.id IN (
  SELECT student_id FROM supervisor_student_relationships
  UNION 
  SELECT supervisor_id FROM supervisor_student_relationships
)
ORDER BY average_rating DESC;
