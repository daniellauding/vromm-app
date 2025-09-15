-- Fix Infinite Recursion in RLS Policies (V2 - Handles Existing Policies)
-- Run this in Supabase CLI SQL Editor

-- 1. Drop ALL existing policies to break the recursion
DROP POLICY IF EXISTS "Users can view their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can view shared presets" ON map_presets;
DROP POLICY IF EXISTS "Users can create presets" ON map_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON map_presets;

DROP POLICY IF EXISTS "Users can view their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can view members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can create memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can add members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can update their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can update members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can delete their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can delete members" ON map_preset_members;

DROP POLICY IF EXISTS "Users can view preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset creators can view routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset members can view routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can create preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset creators can create routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset editors can create routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can update preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset creators can update routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset editors can update routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can delete preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset creators can delete routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Preset editors can delete routes" ON map_preset_routes;

-- 2. Create simple, non-recursive policies for map_presets
CREATE POLICY "map_presets_select_own" ON map_presets
  FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "map_presets_select_shared" ON map_presets
  FOR SELECT USING (
    id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "map_presets_insert" ON map_presets
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "map_presets_update_own" ON map_presets
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "map_presets_delete_own" ON map_presets
  FOR DELETE USING (creator_id = auth.uid());

-- 3. Create simple policies for map_preset_members
CREATE POLICY "map_preset_members_select_user" ON map_preset_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "map_preset_members_select_creator" ON map_preset_members
  FOR SELECT USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_members_insert_user" ON map_preset_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "map_preset_members_insert_creator" ON map_preset_members
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_members_update_user" ON map_preset_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "map_preset_members_update_creator" ON map_preset_members
  FOR UPDATE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_members_delete_user" ON map_preset_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "map_preset_members_delete_creator" ON map_preset_members
  FOR DELETE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

-- 4. Create simple policies for map_preset_routes
CREATE POLICY "map_preset_routes_select_creator" ON map_preset_routes
  FOR SELECT USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_routes_select_member" ON map_preset_routes
  FOR SELECT USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_routes_insert_creator" ON map_preset_routes
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_routes_insert_editor" ON map_preset_routes
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "map_preset_routes_update_creator" ON map_preset_routes
  FOR UPDATE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_routes_update_editor" ON map_preset_routes
  FOR UPDATE USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "map_preset_routes_delete_creator" ON map_preset_routes
  FOR DELETE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "map_preset_routes_delete_editor" ON map_preset_routes
  FOR DELETE USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

-- Success message
SELECT 'RLS policies fixed - infinite recursion resolved! (V2)' as status;
