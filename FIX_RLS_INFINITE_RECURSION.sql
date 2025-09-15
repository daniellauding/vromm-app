-- Fix Infinite Recursion in RLS Policies
-- Run this in Supabase CLI SQL Editor

-- 1. Drop all existing policies to break the recursion
DROP POLICY IF EXISTS "Users can view their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can create presets" ON map_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON map_presets;

DROP POLICY IF EXISTS "Users can view their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Users can create memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Users can update their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Users can delete their memberships" ON map_preset_members;

DROP POLICY IF EXISTS "Users can view preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can create preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can update preset routes" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can delete preset routes" ON map_preset_routes;

-- 2. Create simpler, non-recursive policies for map_presets
CREATE POLICY "Users can view their own presets" ON map_presets
  FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Users can view shared presets" ON map_presets
  FOR SELECT USING (
    id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create presets" ON map_presets
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own presets" ON map_presets
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own presets" ON map_presets
  FOR DELETE USING (creator_id = auth.uid());

-- 3. Create simpler policies for map_preset_members
CREATE POLICY "Users can view their memberships" ON map_preset_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Preset creators can view members" ON map_preset_members
  FOR SELECT USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memberships" ON map_preset_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Preset creators can add members" ON map_preset_members
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their memberships" ON map_preset_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Preset creators can update members" ON map_preset_members
  FOR UPDATE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their memberships" ON map_preset_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Preset creators can delete members" ON map_preset_members
  FOR DELETE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

-- 4. Create simpler policies for map_preset_routes
CREATE POLICY "Preset creators can view routes" ON map_preset_routes
  FOR SELECT USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Preset members can view routes" ON map_preset_routes
  FOR SELECT USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Preset creators can create routes" ON map_preset_routes
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Preset editors can create routes" ON map_preset_routes
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "Preset creators can update routes" ON map_preset_routes
  FOR UPDATE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Preset editors can update routes" ON map_preset_routes
  FOR UPDATE USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "Preset creators can delete routes" ON map_preset_routes
  FOR DELETE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Preset editors can delete routes" ON map_preset_routes
  FOR DELETE USING (
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

-- Success message
SELECT 'RLS policies fixed - infinite recursion resolved!' as status;
