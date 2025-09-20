-- DEBUG INVITATION IDS - CHECK WHAT'S HAPPENING

-- 1. Check all pending invitations
SELECT 'All pending invitations:' as info;
SELECT id, email, status, invited_by, created_at 
FROM pending_invitations 
ORDER BY created_at DESC;

-- 2. Check if there are any with the problematic collection ID
SELECT 'Invitations with problematic collection:' as info;
SELECT id, email, metadata->>'collection_id' as collection_id, metadata
FROM pending_invitations 
WHERE metadata->>'collection_id' = '43cdb003-3df7-4f07-9d04-9055f897c798';

-- 3. Check if the problematic collection exists
SELECT 'Does problematic collection exist?' as info;
SELECT EXISTS(
  SELECT 1 FROM map_presets 
  WHERE id = '43cdb003-3df7-4f07-9d04-9055f897c798'
) as collection_exists;

-- 4. Check recent invitations for the current user
SELECT 'Recent invitations for daniel@lauding.se:' as info;
SELECT id, email, status, invited_by, created_at, metadata
FROM pending_invitations 
WHERE email = 'daniel@lauding.se'
ORDER BY created_at DESC
LIMIT 5;
