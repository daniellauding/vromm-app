-- Map Presets Schema - FINAL FIXED VERSION
-- This file ensures proper order of table creation and policy creation

-- ==============================================
-- 1. DROP EXISTING (to avoid conflicts)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own presets and public presets" ON map_presets;
DROP POLICY IF EXISTS "Users can create their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON map_presets;
DROP POLICY IF EXISTS "Users can view preset routes for accessible presets" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can add routes to accessible presets" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can remove routes from accessible presets" ON map_preset_routes;
DROP POLICY IF EXISTS "Users can view preset members for accessible presets" ON map_preset_members;
DROP POLICY IF EXISTS "Preset creators can manage members" ON map_preset_members;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS create_default_preset_trigger ON auth.users;
DROP TRIGGER IF EXISTS update_map_presets_updated_at ON map_presets;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_default_preset_for_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_preset_route_count(UUID);
DROP FUNCTION IF EXISTS user_has_preset_access(UUID, UUID);

-- ==============================================
-- 2. CREATE TABLES (in correct order)
-- ==============================================

-- Create map_presets table first
CREATE TABLE IF NOT EXISTS map_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private', 'shared')),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_default BOOLEAN DEFAULT FALSE
);

-- Create map_preset_members table second (referenced by other tables)
CREATE TABLE IF NOT EXISTS map_preset_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preset_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, user_id)
);

-- Create map_preset_routes table third (references both above tables)
CREATE TABLE IF NOT EXISTS map_preset_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preset_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, route_id)
);

-- ==============================================
-- 3. CREATE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_map_presets_creator_id ON map_presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_map_presets_visibility ON map_presets(visibility);
CREATE INDEX IF NOT EXISTS idx_map_presets_is_default ON map_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_preset_id ON map_preset_routes(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_route_id ON map_preset_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);

-- ==============================================
-- 4. ENABLE RLS
-- ==============================================

ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 5. CREATE RLS POLICIES (in correct order)
-- ==============================================

-- RLS Policies for map_presets (first - no dependencies)
CREATE POLICY "map_presets_select_policy" ON map_presets
    FOR SELECT USING (
        creator_id = auth.uid() OR 
        visibility = 'public' OR
        id IN (
            SELECT preset_id FROM map_preset_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "map_presets_insert_policy" ON map_presets
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "map_presets_update_policy" ON map_presets
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "map_presets_delete_policy" ON map_presets
    FOR DELETE USING (creator_id = auth.uid());

-- RLS Policies for map_preset_members (second - depends on map_presets)
CREATE POLICY "map_preset_members_select_policy" ON map_preset_members
    FOR SELECT USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public' OR
            id IN (
                SELECT preset_id FROM map_preset_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "map_preset_members_manage_policy" ON map_preset_members
    FOR ALL USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
    );

-- RLS Policies for map_preset_routes (third - depends on both above tables)
CREATE POLICY "map_preset_routes_select_policy" ON map_preset_routes
    FOR SELECT USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public' OR
            id IN (
                SELECT preset_id FROM map_preset_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "map_preset_routes_insert_policy" ON map_preset_routes
    FOR INSERT WITH CHECK (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public' OR
            id IN (
                SELECT preset_id FROM map_preset_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "map_preset_routes_delete_policy" ON map_preset_routes
    FOR DELETE USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public' OR
            id IN (
                SELECT preset_id FROM map_preset_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ==============================================
-- 6. CREATE FUNCTIONS
-- ==============================================

-- Function to create default preset for new users
CREATE OR REPLACE FUNCTION create_default_preset_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO map_presets (name, description, visibility, creator_id, is_default)
    VALUES (
        'All Routes',
        'View all available routes',
        'public',
        NEW.id,
        TRUE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get preset route count
CREATE OR REPLACE FUNCTION get_preset_route_count(preset_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM map_preset_routes
        WHERE preset_id = preset_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to preset
CREATE OR REPLACE FUNCTION user_has_preset_access(preset_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM map_presets
        WHERE id = preset_uuid AND (
            creator_id = user_uuid OR
            visibility = 'public' OR
            id IN (
                SELECT preset_id FROM map_preset_members 
                WHERE user_id = user_uuid
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 7. CREATE TRIGGERS
-- ==============================================

-- Trigger to create default preset when new user is created
CREATE TRIGGER create_default_preset_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_preset_for_user();

-- Trigger to update updated_at on map_presets
CREATE TRIGGER update_map_presets_updated_at
    BEFORE UPDATE ON map_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
