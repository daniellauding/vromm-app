-- FIX PROBLEMATIC INVITATIONS
-- This handles invitations that reference non-existent collections

-- 1. First, let's see what problematic invitations exist
SELECT 'Current problematic invitations:' as status;
SELECT 
  id, 
  email, 
  metadata->>'collection_id' as collection_id,
  metadata->>'collection_name' as collection_name,
  created_at
FROM pending_invitations 
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 2. Option A: Remove collection references from problematic invitations
-- This allows the invitation to be accepted without the collection part
UPDATE pending_invitations 
SET metadata = metadata - 'collection_id' - 'collection_name' - 'sharingRole'
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 3. Option B: Delete problematic invitations entirely (uncomment if you want this)
-- DELETE FROM pending_invitations 
-- WHERE metadata->>'collection_id' IS NOT NULL 
--   AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 4. Verify the fix
SELECT 'After fix - remaining problematic invitations:' as status;
SELECT 
  id, 
  email, 
  metadata->>'collection_id' as collection_id
FROM pending_invitations 
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 5. Show total invitations now
SELECT 'Total pending invitations:' as status;
SELECT COUNT(*) as total_invitations FROM pending_invitations;
