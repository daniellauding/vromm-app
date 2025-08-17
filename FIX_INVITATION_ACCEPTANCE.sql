-- ============================================
-- FIX INVITATION ACCEPTANCE ISSUES
-- ============================================

-- 1. Ensure student_supervisor_relationships table exists with correct structure
CREATE TABLE IF NOT EXISTS student_supervisor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, supervisor_id)
);

-- 2. Drop the old user_relationships table if it exists (it's causing conflicts)
DROP TABLE IF EXISTS user_relationships CASCADE;

-- 3. Clean up duplicate pending invitations (keep only the latest one per email/inviter pair)
DELETE FROM pending_invitations 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, invited_by) id
  FROM pending_invitations 
  ORDER BY email, invited_by, created_at DESC
);

-- 4. Clean up orphaned notifications (notifications without valid invitation_id)
DELETE FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation')
AND metadata->>'invitation_id' IS NOT NULL
AND metadata->>'invitation_id' NOT IN (
  SELECT id::text FROM pending_invitations
);

-- 5. Test the acceptance flow with a real invitation
DO $$
DECLARE
  test_invitation_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Find a pending invitation to test with
  SELECT id INTO test_invitation_id
  FROM pending_invitations 
  WHERE status = 'pending' 
  AND email = 'daniel+student@lauding.se'
  LIMIT 1;
  
  IF test_invitation_id IS NOT NULL THEN
    RAISE NOTICE 'Testing acceptance with invitation ID: %', test_invitation_id;
    
    -- Simulate the acceptance process
    UPDATE pending_invitations 
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    WHERE id = test_invitation_id;
    
    -- Create the relationship
    INSERT INTO student_supervisor_relationships (
      student_id,
      supervisor_id,
      status
    ) 
    SELECT 
      CASE 
        WHEN metadata->>'relationshipType' = 'student_invites_supervisor' 
        THEN invited_by  -- inviter is student
        ELSE 'c16a364f-3bc4-4d60-bca9-460e977fddea'  -- accepter is student
      END,
      CASE 
        WHEN metadata->>'relationshipType' = 'student_invites_supervisor' 
        THEN 'c16a364f-3bc4-4d60-bca9-460e977fddea'  -- accepter is supervisor
        ELSE invited_by  -- inviter is supervisor
      END,
      'active'
    FROM pending_invitations 
    WHERE id = test_invitation_id
    ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
      status = 'active',
      updated_at = NOW();
    
    RAISE NOTICE 'Test acceptance completed successfully';
  ELSE
    RAISE NOTICE 'No pending invitations found to test with';
  END IF;
END $$;

-- 6. Show current state
SELECT 
  'PENDING_INVITATIONS' as table_name,
  COUNT(*) as count,
  string_agg(DISTINCT status, ', ') as statuses
FROM pending_invitations
UNION ALL
SELECT 
  'NOTIFICATIONS' as table_name,
  COUNT(*) as count,
  string_agg(DISTINCT type::text, ', ') as types
FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation')
UNION ALL
SELECT 
  'RELATIONSHIPS' as table_name,
  COUNT(*) as count,
  string_agg(DISTINCT status, ', ') as statuses
FROM student_supervisor_relationships;
