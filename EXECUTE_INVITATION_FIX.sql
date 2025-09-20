-- EXECUTE INVITATION FIX
-- This will fix the problematic invitations that are causing the errors

-- 1. First, let's see the problematic invitations
SELECT 'Step 1: Checking problematic invitations...' as status;
SELECT 
  id, 
  email, 
  metadata->>'collection_id' as collection_id,
  metadata->>'collection_name' as collection_name,
  created_at
FROM pending_invitations 
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 2. Fix the problematic invitations by removing invalid collection references
SELECT 'Step 2: Fixing problematic invitations...' as status;
UPDATE pending_invitations 
SET metadata = metadata - 'collection_id' - 'collection_name' - 'sharingRole'
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 3. Verify the fix worked
SELECT 'Step 3: Verification - remaining problematic invitations:' as status;
SELECT 
  id, 
  email, 
  metadata->>'collection_id' as collection_id
FROM pending_invitations 
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 4. Show total invitations after fix
SELECT 'Step 4: Total pending invitations after fix:' as status;
SELECT COUNT(*) as total_invitations FROM pending_invitations;

-- 5. Show a sample of fixed invitations
SELECT 'Step 5: Sample of fixed invitations:' as status;
SELECT 
  id, 
  email, 
  metadata,
  created_at
FROM pending_invitations 
LIMIT 3;
