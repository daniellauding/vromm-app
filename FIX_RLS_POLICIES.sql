-- Fix RLS Policies - Remove infinite recursion
-- This script fixes the infinite recursion in map_presets policies

-- Drop ALL the problematic policies
DROP POLICY IF EXISTS "map_presets_select_policy" ON map_presets;
DROP POLICY IF EXISTS "map_preset_members_select_policy" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_routes_select_policy" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_insert_policy" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_delete_policy" ON map_preset_routes;

-- Recreate the policies without infinite recursion
-- First, create a simple map_presets policy that doesn't reference map_preset_members
CREATE POLICY "map_presets_select_policy" ON map_presets
    FOR SELECT USING (
        creator_id = auth.uid() OR 
        visibility = 'public'
    );

CREATE POLICY "map_preset_members_select_policy" ON map_preset_members
    FOR SELECT USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public'
        ) OR
        user_id = auth.uid()
    );

CREATE POLICY "map_preset_routes_select_policy" ON map_preset_routes
    FOR SELECT USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public'
        ) OR
        preset_id IN (
            SELECT preset_id FROM map_preset_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "map_preset_routes_insert_policy" ON map_preset_routes
    FOR INSERT WITH CHECK (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public'
        ) OR
        preset_id IN (
            SELECT preset_id FROM map_preset_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "map_preset_routes_delete_policy" ON map_preset_routes
    FOR DELETE USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public'
        ) OR
        preset_id IN (
            SELECT preset_id FROM map_preset_members 
            WHERE user_id = auth.uid()
        )
    );
