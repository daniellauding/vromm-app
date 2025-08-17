-- Comprehensive cleanup of duplicate invitations
-- This script will clean up duplicates and apply the constraint

-- Step 1: Backup the current state (optional - for safety)
-- CREATE TABLE pending_invitations_backup AS SELECT * FROM pending_invitations;

-- Step 2: Identify and remove duplicates, keeping the most recent one
-- For each group of duplicates (same email, invited_by, status), keep only the latest
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email, invited_by, status 
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
  FROM pending_invitations
)
DELETE FROM pending_invitations 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Clean up any orphaned or invalid invitations
-- Remove invitations where the inviter no longer exists
DELETE FROM pending_invitations 
WHERE invited_by NOT IN (SELECT id FROM profiles);

-- Remove invitations where the email already has an accepted invitation from the same inviter
-- (This handles cases where someone was invited multiple times and accepted)
DELETE FROM pending_invitations 
WHERE status = 'pending' 
  AND (email, invited_by) IN (
    SELECT email, invited_by 
    FROM pending_invitations 
    WHERE status = 'accepted'
  );

-- Step 4: Now try to add the unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_pending_invitation_per_relationship'
    AND table_name = 'pending_invitations'
  ) THEN
    ALTER TABLE pending_invitations 
    ADD CONSTRAINT unique_pending_invitation_per_relationship 
    UNIQUE (email, invited_by, status) 
    DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Step 5: Verify the cleanup worked
SELECT 
  'Remaining duplicates' as check_type,
  COUNT(*) as count
FROM (
  SELECT email, invited_by, status, COUNT(*) as dup_count
  FROM pending_invitations
  GROUP BY email, invited_by, status
  HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
  'Total invitations' as check_type,
  COUNT(*) as count
FROM pending_invitations

UNION ALL

SELECT 
  'Pending invitations' as check_type,
  COUNT(*) as count
FROM pending_invitations
WHERE status = 'pending'

UNION ALL

SELECT 
  'Accepted invitations' as check_type,
  COUNT(*) as count
FROM pending_invitations
WHERE status = 'accepted';
