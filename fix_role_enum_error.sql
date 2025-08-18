-- FIX: Replace 'supervisor' with correct role names
-- The error shows 'supervisor' is not a valid enum value

-- Fix the rating functions to use correct roles
CREATE OR REPLACE FUNCTION get_supervisor_average_rating(supervisor_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM relationship_reviews
    WHERE supervisor_id = supervisor_user_id
    AND review_type = 'student_reviews_supervisor'
    AND is_hidden = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the search functions to use correct roles
CREATE OR REPLACE FUNCTION get_available_supervisors_with_ratings(current_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  location TEXT,
  average_rating NUMERIC,
  review_count BIGINT,
  recent_review_content TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.location,
    COALESCE(AVG(rr.rating), 0) as average_rating,
    COUNT(rr.id) as review_count,
    (SELECT content FROM relationship_reviews 
     WHERE supervisor_id = p.id AND content IS NOT NULL 
     ORDER BY created_at DESC LIMIT 1) as recent_review_content
  FROM profiles p
  LEFT JOIN relationship_reviews rr ON rr.supervisor_id = p.id 
    AND rr.review_type = 'student_reviews_supervisor' 
    AND rr.is_hidden = FALSE
  WHERE p.role IN ('instructor', 'teacher', 'school', 'admin')  -- Fixed: removed 'supervisor'
    AND p.id != current_user_id
    AND p.id NOT IN (
      SELECT supervisor_id FROM supervisor_student_relationships 
      WHERE student_id = current_user_id AND status = 'active'
    )
  GROUP BY p.id, p.full_name, p.email, p.role, p.location
  ORDER BY average_rating DESC, review_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the fix
SELECT 'Functions fixed' as status;

-- Show available roles in your database
SELECT DISTINCT role, COUNT(*) as count
FROM profiles 
GROUP BY role 
ORDER BY role;
