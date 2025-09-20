-- CHECK AND FIX SPECIFIC COLLECTION
-- This targets the specific collection causing the error

-- 1. Check if the collection exists
SELECT 'Step 1: Checking if collection exists...' as status;
SELECT 
  id, 
  name, 
  created_at
FROM map_presets 
WHERE id = 'b4bc33ee-4966-4631-be0f-ea6d7bc58dce';

-- 2. If collection doesn't exist, fix the invitation
SELECT 'Step 2: Fixing invitation if collection missing...' as status;
UPDATE pending_invitations 
SET metadata = metadata - 'collectionId' - 'collectionName' - 'sharingRole'
WHERE id = 'ebf37be4-2be2-4456-baf7-033089535dcc'
  AND (metadata->>'collectionId')::UUID NOT IN (SELECT id FROM map_presets);

-- 3. Verify the fix
SELECT 'Step 3: Checking invitation after fix...' as status;
SELECT 
  id, 
  email, 
  metadata->>'collectionId' as collection_id,
  metadata->>'collectionName' as collection_name
FROM pending_invitations 
WHERE id = 'ebf37be4-2be2-4456-baf7-033089535dcc';

-- 4. Test if the collection ID exists in map_presets
SELECT 'Step 4: Final verification - collection exists?' as status;
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM map_presets WHERE id = 'b4bc33ee-4966-4631-be0f-ea6d7bc58dce') 
    THEN 'Collection EXISTS - invitation should work'
    ELSE 'Collection MISSING - invitation has been fixed'
  END as result;
