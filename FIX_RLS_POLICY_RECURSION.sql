-- Fix infinite recursion in RLS policy for map_preset_members table

-- 1. First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'map_preset_members';

-- 2. Drop the problematic policy (if it exists)
DROP POLICY IF EXISTS "Users can view collection members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can manage collection members" ON map_preset_members;
DROP POLICY IF EXISTS "Collection creators can manage members" ON map_preset_members;

-- 3. Create a simple, non-recursive policy for viewing members
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

-- 4. Create policy for inserting members (only collection creators)
CREATE POLICY "Collection creators can add members" ON map_preset_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM map_presets mp 
            WHERE mp.id = map_preset_members.preset_id 
            AND mp.creator_id = auth.uid()
        )
    );

-- 5. Create policy for updating members (only collection creators)
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

-- 6. Create policy for deleting members (collection creators and the member themselves)
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

-- 7. Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'map_preset_members'
ORDER BY policyname;
