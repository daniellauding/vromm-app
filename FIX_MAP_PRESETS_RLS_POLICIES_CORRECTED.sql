-- Fix RLS Policies for Map Presets System (CORRECTED)
-- Run this in Supabase CLI SQL Editor

-- 1. Enable RLS on all map preset tables
ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
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

-- 3. Add role column to map_preset_members if it doesn't exist
ALTER TABLE map_preset_members 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'read' CHECK (role IN ('read', 'edit'));

-- 4. Create comprehensive RLS policies for map_presets
CREATE POLICY "Users can view their own presets" ON map_presets
  FOR SELECT USING (
    creator_id = auth.uid() OR 
    id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create presets" ON map_presets
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own presets" ON map_presets
  FOR UPDATE USING (
    creator_id = auth.uid() OR 
    id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "Users can delete their own presets" ON map_presets
  FOR DELETE USING (creator_id = auth.uid());

-- 5. Create comprehensive RLS policies for map_preset_members
CREATE POLICY "Users can view their memberships" ON map_preset_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memberships" ON map_preset_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their memberships" ON map_preset_members
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their memberships" ON map_preset_members
  FOR DELETE USING (
    user_id = auth.uid() OR 
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    )
  );

-- 6. Create comprehensive RLS policies for map_preset_routes
CREATE POLICY "Users can view preset routes" ON map_preset_routes
  FOR SELECT USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    ) OR 
    preset_id IN (
      SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create preset routes" ON map_preset_routes
  FOR INSERT WITH CHECK (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    ) OR 
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "Users can update preset routes" ON map_preset_routes
  FOR UPDATE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    ) OR 
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

CREATE POLICY "Users can delete preset routes" ON map_preset_routes
  FOR DELETE USING (
    preset_id IN (
      SELECT id FROM map_presets WHERE creator_id = auth.uid()
    ) OR 
    preset_id IN (
      SELECT preset_id FROM map_preset_members 
      WHERE user_id = auth.uid() AND role = 'edit'
    )
  );

-- 7. Update existing memberships to have 'edit' role for creator
UPDATE map_preset_members 
SET role = 'edit' 
WHERE user_id IN (
  SELECT creator_id FROM map_presets 
  WHERE map_presets.id = map_preset_members.preset_id
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_map_presets_creator_id ON map_presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_role ON map_preset_members(role);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_preset_id ON map_preset_routes(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_route_id ON map_preset_routes(route_id);

-- 9. Add updated_at trigger for map_presets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_map_presets_updated_at ON map_presets;
CREATE TRIGGER update_map_presets_updated_at
    BEFORE UPDATE ON map_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Add updated_at trigger for map_preset_members
DROP TRIGGER IF EXISTS update_map_preset_members_updated_at ON map_preset_members;
CREATE TRIGGER update_map_preset_members_updated_at
    BEFORE UPDATE ON map_preset_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Add updated_at trigger for map_preset_routes
DROP TRIGGER IF EXISTS update_map_preset_routes_updated_at ON map_preset_routes;
CREATE TRIGGER update_map_preset_routes_updated_at
    BEFORE UPDATE ON map_preset_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Drop existing view if it exists and recreate with correct columns
DROP VIEW IF EXISTS map_presets_with_counts;

-- Create view for collections with member count
CREATE VIEW map_presets_with_counts AS
SELECT 
    mp.*,
    COALESCE(member_count.count, 0) as member_count,
    COALESCE(route_count.count, 0) as route_count
FROM map_presets mp
LEFT JOIN (
    SELECT preset_id, COUNT(*) as count
    FROM map_preset_members
    GROUP BY preset_id
) member_count ON mp.id = member_count.preset_id
LEFT JOIN (
    SELECT preset_id, COUNT(*) as count
    FROM map_preset_routes
    GROUP BY preset_id
) route_count ON mp.id = route_count.preset_id;

-- 13. Enable RLS on the view
ALTER VIEW map_presets_with_counts SET (security_invoker = true);

-- 14. Grant permissions
GRANT SELECT ON map_presets_with_counts TO authenticated;
GRANT SELECT ON map_presets TO authenticated;
GRANT SELECT ON map_preset_members TO authenticated;
GRANT SELECT ON map_preset_routes TO authenticated;

-- 15. Add comments for documentation
COMMENT ON TABLE map_presets IS 'Collections of routes that can be shared between users';
COMMENT ON TABLE map_preset_members IS 'Membership table for shared collections with role-based access';
COMMENT ON TABLE map_preset_routes IS 'Junction table linking routes to collections';
COMMENT ON COLUMN map_preset_members.role IS 'Access level: read (view only) or edit (can modify)';
COMMENT ON COLUMN map_presets.visibility IS 'Collection visibility: private, shared, or public';
COMMENT ON COLUMN map_presets.is_default IS 'Whether this is the users default collection';

-- Success message
SELECT 'Map presets RLS policies and schema fixes applied successfully!' as status;
