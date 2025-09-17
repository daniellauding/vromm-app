-- Fix RLS policy for map_preset_members to allow collection sharing invitations
-- This allows users to be added to collections when they accept invitations

-- First, check if the table exists and has the right structure
DO $$
BEGIN
    -- Check if map_preset_members table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_members') THEN
        -- Drop existing restrictive policies
        DROP POLICY IF EXISTS "Users can only see their own memberships" ON map_preset_members;
        DROP POLICY IF EXISTS "Users can only insert their own memberships" ON map_preset_members;
        DROP POLICY IF EXISTS "Users can only update their own memberships" ON map_preset_members;
        DROP POLICY IF EXISTS "Users can only delete their own memberships" ON map_preset_members;
        
        -- Create new policies that allow collection sharing
        CREATE POLICY "Users can see memberships for collections they own or are members of" ON map_preset_members
            FOR SELECT
            USING (
                -- User can see memberships for collections they own
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
                OR
                -- User can see memberships for collections they are a member of
                EXISTS (
                    SELECT 1 FROM map_preset_members mp2
                    WHERE mp2.preset_id = map_preset_members.preset_id 
                    AND mp2.user_id = auth.uid()
                )
                OR
                -- User can see their own membership
                user_id = auth.uid()
            );
        
        CREATE POLICY "Users can be added to collections via invitations" ON map_preset_members
            FOR INSERT
            WITH CHECK (
                -- Collection owner can add members
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
                OR
                -- User can add themselves if they have a pending invitation
                (
                    user_id = auth.uid()
                    AND EXISTS (
                        SELECT 1 FROM pending_invitations pi
                        WHERE pi.email = (
                            SELECT email FROM profiles WHERE id = auth.uid()
                        )
                        AND pi.role = 'collection_sharing'
                        AND pi.status = 'pending'
                        AND pi.metadata->>'collectionId' = map_preset_members.preset_id::text
                    )
                )
            );
        
        CREATE POLICY "Collection owners can update memberships" ON map_preset_members
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
            );
        
        CREATE POLICY "Collection owners can delete memberships" ON map_preset_members
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
                OR
                -- Users can remove themselves
                user_id = auth.uid()
            );
        
        RAISE NOTICE 'RLS policies updated for map_preset_members table';
    ELSE
        RAISE NOTICE 'map_preset_members table does not exist';
    END IF;
END $$;
