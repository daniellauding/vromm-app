-- SQL queries for relationship reviews system

-- 1. Get all reviews for a specific user (to display on their profile)
-- Replace 'USER_ID_HERE' with actual user ID
SELECT 
  rr.id,
  rr.student_id,
  rr.supervisor_id,
  rr.reviewer_id,
  rr.rating,
  rr.content,
  rr.review_type,
  rr.is_anonymous,
  rr.created_at,
  reviewer.full_name as reviewer_name,
  reviewer.role as reviewer_role
FROM relationship_reviews rr
LEFT JOIN profiles reviewer ON rr.reviewer_id = reviewer.id
WHERE rr.student_id = 'USER_ID_HERE' OR rr.supervisor_id = 'USER_ID_HERE'
ORDER BY rr.created_at DESC;

-- 2. Get average rating and review count for a user
-- This is what you'll display on profile cards/listings
SELECT 
  p.id,
  p.full_name,
  p.role,
  CASE 
    WHEN p.role IN ('instructor', 'supervisor') THEN 
      COALESCE(
        (SELECT AVG(rating)::NUMERIC(3,2) FROM relationship_reviews 
         WHERE supervisor_id = p.id AND review_type = 'student_reviews_supervisor'), 
        0
      )
    WHEN p.role = 'student' THEN
      COALESCE(
        (SELECT AVG(rating)::NUMERIC(3,2) FROM relationship_reviews 
         WHERE student_id = p.id AND review_type = 'supervisor_reviews_student'), 
        0
      )
    ELSE 0
  END as average_rating,
  CASE 
    WHEN p.role IN ('instructor', 'supervisor') THEN 
      (SELECT COUNT(*) FROM relationship_reviews 
       WHERE supervisor_id = p.id AND review_type = 'student_reviews_supervisor')
    WHEN p.role = 'student' THEN
      (SELECT COUNT(*) FROM relationship_reviews 
       WHERE student_id = p.id AND review_type = 'supervisor_reviews_student')
    ELSE 0
  END as review_count
FROM profiles p
WHERE p.id = 'USER_ID_HERE';

-- 3. Check if current user can review a specific profile user
-- Replace USER_ID_HERE with current user, PROFILE_USER_ID with target user
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM supervisor_student_relationships ssr
      WHERE (ssr.student_id = 'USER_ID_HERE' AND ssr.supervisor_id = 'PROFILE_USER_ID')
         OR (ssr.student_id = 'PROFILE_USER_ID' AND ssr.supervisor_id = 'USER_ID_HERE')
    ) THEN TRUE
    ELSE FALSE
  END as can_review,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM relationship_reviews rr
      WHERE rr.reviewer_id = 'USER_ID_HERE'
        AND ((rr.student_id = 'PROFILE_USER_ID' AND rr.supervisor_id = 'USER_ID_HERE')
          OR (rr.student_id = 'USER_ID_HERE' AND rr.supervisor_id = 'PROFILE_USER_ID'))
    ) THEN TRUE
    ELSE FALSE
  END as already_reviewed;

-- 4. Get reviews breakdown by rating (for analytics)
SELECT 
  rating,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM relationship_reviews
WHERE supervisor_id = 'USER_ID_HERE' OR student_id = 'USER_ID_HERE'
GROUP BY rating
ORDER BY rating DESC;

-- 5. Recent reviews across the platform (for admin dashboard)
SELECT 
  rr.id,
  rr.rating,
  rr.content,
  rr.review_type,
  rr.created_at,
  reviewer.full_name as reviewer_name,
  student.full_name as student_name,
  supervisor.full_name as supervisor_name
FROM relationship_reviews rr
LEFT JOIN profiles reviewer ON rr.reviewer_id = reviewer.id
LEFT JOIN profiles student ON rr.student_id = student.id
LEFT JOIN profiles supervisor ON rr.supervisor_id = supervisor.id
ORDER BY rr.created_at DESC
LIMIT 20;

-- 6. Top rated users by role (for featuring good supervisors/students)
WITH user_ratings AS (
  SELECT 
    p.id,
    p.full_name,
    p.role,
    CASE 
      WHEN p.role IN ('instructor', 'supervisor') THEN 
        (SELECT AVG(rating)::NUMERIC(3,2) FROM relationship_reviews 
         WHERE supervisor_id = p.id AND review_type = 'student_reviews_supervisor')
      WHEN p.role = 'student' THEN
        (SELECT AVG(rating)::NUMERIC(3,2) FROM relationship_reviews 
         WHERE student_id = p.id AND review_type = 'supervisor_reviews_student')
    END as average_rating,
    CASE 
      WHEN p.role IN ('instructor', 'supervisor') THEN 
        (SELECT COUNT(*) FROM relationship_reviews 
         WHERE supervisor_id = p.id AND review_type = 'student_reviews_supervisor')
      WHEN p.role = 'student' THEN
        (SELECT COUNT(*) FROM relationship_reviews 
         WHERE student_id = p.id AND review_type = 'supervisor_reviews_student')
    END as review_count
  FROM profiles p
  WHERE p.role IN ('student', 'instructor', 'supervisor')
)
SELECT 
  role,
  full_name,
  average_rating,
  review_count
FROM user_ratings
WHERE review_count >= 3 -- Only users with at least 3 reviews
  AND average_rating >= 4.0
ORDER BY role, average_rating DESC, review_count DESC;
