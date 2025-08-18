-- MISSING LINK: Connect invitations to relationships
-- Copy and paste this to complete the system

-- 1. Function to create relationship when invitation is accepted
CREATE OR REPLACE FUNCTION accept_invitation_and_create_relationship(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  inv_record RECORD;
  target_user_id UUID;
  relationship_exists BOOLEAN;
BEGIN
  -- Get invitation details
  SELECT * INTO inv_record 
  FROM pending_invitations 
  WHERE id = invitation_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE; -- Invitation not found or already processed
  END IF;
  
  -- Get target user ID (the person being invited)
  SELECT id INTO target_user_id 
  FROM profiles 
  WHERE email = inv_record.email;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- Target user not found
  END IF;
  
  -- Check if relationship already exists
  SELECT EXISTS (
    SELECT 1 FROM supervisor_student_relationships 
    WHERE (student_id = target_user_id AND supervisor_id = inv_record.invited_by)
       OR (student_id = inv_record.invited_by AND supervisor_id = target_user_id)
  ) INTO relationship_exists;
  
  IF relationship_exists THEN
    -- Just mark invitation as accepted
    UPDATE pending_invitations 
    SET status = 'accepted', updated_at = NOW() 
    WHERE id = invitation_id;
    RETURN TRUE;
  END IF;
  
  -- Determine student and supervisor based on roles and invitation type
  DECLARE
    student_id UUID;
    supervisor_id UUID;
    inviter_role TEXT;
    target_role TEXT;
  BEGIN
    -- Get roles
    SELECT role INTO inviter_role FROM profiles WHERE id = inv_record.invited_by;
    SELECT role INTO target_role FROM profiles WHERE id = target_user_id;
    
    -- Determine relationship structure
    IF inviter_role = 'student' AND target_role IN ('instructor', 'supervisor') THEN
      student_id := inv_record.invited_by;
      supervisor_id := target_user_id;
    ELSIF inviter_role IN ('instructor', 'supervisor') AND target_role = 'student' THEN
      student_id := target_user_id;
      supervisor_id := inv_record.invited_by;
    ELSE
      -- Invalid role combination
      RETURN FALSE;
    END IF;
    
    -- Create the relationship
    INSERT INTO supervisor_student_relationships (student_id, supervisor_id, status)
    VALUES (student_id, supervisor_id, 'active');
    
    -- Mark invitation as accepted
    UPDATE pending_invitations 
    SET status = 'accepted', updated_at = NOW() 
    WHERE id = invitation_id;
    
    RETURN TRUE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get users available for relationships (with ratings)
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
  WHERE p.role IN ('instructor', 'supervisor')
    AND p.id != current_user_id
    AND p.id NOT IN (
      SELECT supervisor_id FROM supervisor_student_relationships 
      WHERE student_id = current_user_id AND status = 'active'
    )
  GROUP BY p.id, p.full_name, p.email, p.role, p.location
  ORDER BY average_rating DESC, review_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get students for supervisors (with ratings)
CREATE OR REPLACE FUNCTION get_available_students_with_ratings(current_user_id UUID)
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
     WHERE student_id = p.id AND content IS NOT NULL 
     ORDER BY created_at DESC LIMIT 1) as recent_review_content
  FROM profiles p
  LEFT JOIN relationship_reviews rr ON rr.student_id = p.id 
    AND rr.review_type = 'supervisor_reviews_student' 
    AND rr.is_hidden = FALSE
  WHERE p.role = 'student'
    AND p.id != current_user_id
    AND p.id NOT IN (
      SELECT student_id FROM supervisor_student_relationships 
      WHERE supervisor_id = current_user_id AND status = 'active'
    )
  GROUP BY p.id, p.full_name, p.email, p.role, p.location
  ORDER BY average_rating DESC, review_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Test the system by accepting a pending invitation
-- REPLACE 'INVITATION_ID_HERE' with a real invitation ID from your pending_invitations table
/*
SELECT accept_invitation_and_create_relationship('INVITATION_ID_HERE');
*/

-- 5. Test getting available supervisors (replace USER_ID with real student ID)
/*
SELECT * FROM get_available_supervisors_with_ratings('STUDENT_USER_ID_HERE');
*/

-- 6. Verify the functions were created
SELECT 
  'accept_invitation_and_create_relationship' as function_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'accept_invitation_and_create_relationship') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END as status

UNION ALL

SELECT 
  'get_available_supervisors_with_ratings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_available_supervisors_with_ratings') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END

UNION ALL

SELECT 
  'get_available_students_with_ratings',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_available_students_with_ratings') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END;
