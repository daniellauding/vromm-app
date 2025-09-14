-- Map Presets Schema
-- This file contains the complete database schema for the map presets feature

-- Create map_presets table
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

-- Create map_preset_routes junction table
CREATE TABLE IF NOT EXISTS map_preset_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preset_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, route_id)
);

-- Create map_preset_members table for shared presets
CREATE TABLE IF NOT EXISTS map_preset_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preset_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_map_presets_creator_id ON map_presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_map_presets_visibility ON map_presets(visibility);
CREATE INDEX IF NOT EXISTS idx_map_presets_is_default ON map_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_preset_id ON map_preset_routes(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_route_id ON map_preset_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for map_presets
CREATE POLICY "Users can view their own presets and public presets" ON map_presets
    FOR SELECT USING (
        creator_id = auth.uid() OR 
        visibility = 'public' OR
        id IN (
            SELECT preset_id FROM map_preset_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own presets" ON map_presets
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own presets" ON map_presets
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own presets" ON map_presets
    FOR DELETE USING (creator_id = auth.uid());

-- RLS Policies for map_preset_routes
CREATE POLICY "Users can view preset routes for accessible presets" ON map_preset_routes
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

CREATE POLICY "Users can add routes to accessible presets" ON map_preset_routes
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

CREATE POLICY "Users can remove routes from accessible presets" ON map_preset_routes
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

-- RLS Policies for map_preset_members
CREATE POLICY "Users can view preset members for accessible presets" ON map_preset_members
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

CREATE POLICY "Preset creators can manage members" ON map_preset_members
    FOR ALL USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
    );

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

-- Trigger to create default preset when new user is created
CREATE TRIGGER create_default_preset_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_preset_for_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on map_presets
CREATE TRIGGER update_map_presets_updated_at
    BEFORE UPDATE ON map_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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