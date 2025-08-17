-- Emergency cleanup for duplicate invitations
-- This will remove duplicates while preserving the most recent ones

-- First, let's see what duplicates we have
SELECT 
  email, 
  invited_by, 
  status,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at DESC) as invitation_ids,
  array_agg(created_at ORDER BY created_at DESC) as dates
FROM pending_invitations 
WHERE email IN ('daniel+handledare@lauding.se', 'daniel+student@lauding.se')
GROUP BY email, invited_by, status
HAVING COUNT(*) > 1;

-- Remove duplicates, keeping only the most recent one for each (email, invited_by, status) combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email, invited_by, status 
      ORDER BY created_at DESC
    ) as rn
  FROM pending_invitations
  WHERE email IN ('daniel+handledare@lauding.se', 'daniel+student@lauding.se')
)
DELETE FROM pending_invitations 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Show remaining invitations
SELECT 
  id,
  email,
  role,
  invited_by,
  status,
  created_at,
  metadata->>'relationshipType' as relationship_type,
  metadata->>'supervisorName' as inviter_name
FROM pending_invitations 
WHERE email IN ('daniel+handledare@lauding.se', 'daniel+student@lauding.se')
ORDER BY email, created_at DESC;
