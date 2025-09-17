-- Fix existing collection invitations that have NULL collection_id

-- 1. First, let's see what we have
SELECT 
    pi.id,
    pi.email,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.created_at
FROM pending_invitations pi
WHERE pi.role = 'collection_sharing'
  AND pi.metadata->>'collectionId' IS NULL;

-- 2. Update the NULL collection_id with the correct collection ID based on collection name
UPDATE pending_invitations 
SET metadata = jsonb_set(
    metadata, 
    '{collectionId}', 
    to_jsonb(mp.id::text)
)
FROM map_presets mp
WHERE pending_invitations.role = 'collection_sharing'
  AND pending_invitations.metadata->>'collectionId' IS NULL
  AND pending_invitations.metadata->>'collectionName' = mp.name
  AND pending_invitations.invited_by = mp.creator_id;

-- 3. Verify the fix
SELECT 
    pi.id,
    pi.email,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.status,
    pi.created_at
FROM pending_invitations pi
WHERE pi.role = 'collection_sharing'
ORDER BY pi.created_at DESC;

-- 4. Test the corrected query
SELECT 
    mp.id as collection_id,
    mp.name as collection_name,
    creator.email as creator_email,
    COUNT(DISTINCT pi.id) as pending_invitations,
    COUNT(DISTINCT mpm.id) as accepted_members
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
LEFT JOIN pending_invitations pi ON mp.id::text = pi.metadata->>'collectionId' 
    AND pi.role = 'collection_sharing' 
    AND pi.status = 'pending'
LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id
GROUP BY mp.id, mp.name, mp.creator_id, creator.email, creator.full_name
ORDER BY mp.created_at DESC;
