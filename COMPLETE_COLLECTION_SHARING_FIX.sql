-- Complete fix for collection sharing issues
-- This addresses both the RLS policy recursion and the NULL collection_id issue

-- ==============================================
-- PART 1: Fix RLS Policy Infinite Recursion
-- ==============================================

-- Drop all existing policies on map_preset_members
DROP POLICY IF EXISTS "Users can view collection members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can manage collection members" ON map_preset_members;
DROP POLICY IF EXISTS "Collection creators can manage members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Collection creators can add members" ON map_preset_members;
DROP POLICY IF EXISTS "Collection creators can update members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can remove collection members" ON map_preset_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view collection members" ON map_preset_members
    FOR SELECT
    USING (
        -- User is the creator of the collection
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
        OR
        -- User is a member of the collection
        user_id = auth.uid()
    );

CREATE POLICY "Collection creators can add members" ON map_preset_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
    );

CREATE POLICY "Collection creators can update members" ON map_preset_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove collection members" ON map_preset_members
    FOR DELETE
    USING (
        -- User is the creator of the collection
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
        OR
        -- User is removing themselves
        user_id = auth.uid()
    );

-- ==============================================
-- PART 2: Fix Existing Data with NULL collection_id
-- ==============================================

-- Update the NULL collection_id with the correct collection ID based on collection name
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

-- ==============================================
-- PART 3: Verification Queries
-- ==============================================

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'map_preset_members'
ORDER BY policyname;

-- Verify the data fix
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

-- Test the corrected collection query
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
