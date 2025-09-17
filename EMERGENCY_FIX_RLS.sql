-- EMERGENCY FIX: Temporarily disable RLS to stop infinite recursion
-- Run this in Supabase CLI SQL Editor

-- 1. Temporarily disable RLS on all map_preset tables
ALTER TABLE map_presets DISABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to clean slate
DROP POLICY IF EXISTS "Users can view their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can view shared presets" ON map_presets;
DROP POLICY IF EXISTS "Users can create presets" ON map_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON map_presets;
DROP POLICY IF EXISTS "map_presets_select_own" ON map_presets;
DROP POLICY IF EXISTS "map_presets_select_shared" ON map_presets;
DROP POLICY IF EXISTS "map_presets_insert" ON map_presets;
DROP POLICY IF EXISTS "map_presets_update_own" ON map_presets;
DROP POLICY IF EXISTS "map_presets_delete_own" ON map_presets;

DROP POLICY IF EXISTS "Users can view their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can view members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can create memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can add members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can update their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can update members" ON map_preset_members;
DROP POLICY IF EXISTS "Users can delete their memberships" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can delete members" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_select_user" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_select_creator" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_insert_user" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_insert_creator" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_update_user" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_update_creator" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_delete_user" ON map_preset_members;
DROP POLICY IF EXISTS "map_preset_members_delete_creator" ON map_preset_members;

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
DROP POLICY IF EXISTS "map_preset_routes_select_creator" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_select_member" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_insert_creator" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_insert_editor" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_update_creator" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_update_editor" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_delete_creator" ON map_preset_routes;
DROP POLICY IF EXISTS "map_preset_routes_delete_editor" ON map_preset_routes;

-- 3. Grant basic permissions to authenticated users
GRANT ALL ON map_presets TO authenticated;
GRANT ALL ON map_preset_members TO authenticated;
GRANT ALL ON map_preset_routes TO authenticated;

-- Success message
SELECT 'EMERGENCY FIX APPLIED: RLS disabled temporarily - collections should work now!' as status;
