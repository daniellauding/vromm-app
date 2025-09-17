-- Fix RLS policy for map_preset_members to avoid infinite recursion
-- This allows users to be added to collections when they accept invitations

DO $$
BEGIN
    -- Check if map_preset_members table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_members') THEN
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can see memberships for collections they own or are members of" ON map_preset_members;
        DROP POLICY IF EXISTS "Users can be added to collections via invitations" ON map_preset_members;
        DROP POLICY IF EXISTS "Collection owners can update memberships" ON map_preset_members;
        DROP POLICY IF EXISTS "Collection owners can delete memberships" ON map_preset_members;
        
        -- Create simplified policies that avoid recursion
        
        -- SELECT policy: Users can see memberships for collections they own, or their own membership
        CREATE POLICY "Users can see relevant memberships" ON map_preset_members
            FOR SELECT
            USING (
                -- User can see memberships for collections they own
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
                OR
                -- User can see their own membership
                user_id = auth.uid()
            );
        
        -- INSERT policy: Collection owners can add members, or users can add themselves via invitations
        CREATE POLICY "Users can add memberships" ON map_preset_members
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
        
        -- UPDATE policy: Only collection owners can update memberships
        CREATE POLICY "Collection owners can update memberships" ON map_preset_members
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM map_presets 
                    WHERE map_presets.id = map_preset_members.preset_id 
                    AND map_presets.creator_id = auth.uid()
                )
            );
        
        -- DELETE policy: Collection owners can delete memberships, users can remove themselves
        CREATE POLICY "Users can delete relevant memberships" ON map_preset_members
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
        
        RAISE NOTICE 'RLS policies updated for map_preset_members table (v2 - no recursion)';
    ELSE
        RAISE NOTICE 'map_preset_members table does not exist';
    END IF;
END $$;
