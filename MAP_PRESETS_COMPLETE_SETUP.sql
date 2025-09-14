-- COMPLETE MAP PRESETS SETUP
-- Copy and paste this entire file into your Supabase SQL editor
-- This includes schema, policies, functions, and translations

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
-- 2. CREATE TABLES
-- ==============================================

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
-- 5. CREATE RLS POLICIES
-- ==============================================

-- RLS Policies for map_presets
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

-- RLS Policies for map_preset_routes
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

-- RLS Policies for map_preset_members
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

-- ==============================================
-- 8. INSERT ENGLISH TRANSLATIONS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Map Presets General
('mapPresets.title', 'Map Presets', 'en', 'mobile'),
('mapPresets.description', 'Organize your routes into custom collections', 'en', 'mobile'),
('mapPresets.createNew', 'Create New', 'en', 'mobile'),
('mapPresets.edit', 'Edit', 'en', 'mobile'),
('mapPresets.delete', 'Delete', 'en', 'mobile'),
('mapPresets.save', 'Save', 'en', 'mobile'),
('mapPresets.cancel', 'Cancel', 'en', 'mobile'),
('mapPresets.done', 'Done', 'en', 'mobile'),
('mapPresets.loading', 'Loading...', 'en', 'mobile'),

-- Map Presets List
('mapPresets.selectPreset', 'Select Preset', 'en', 'mobile'),
('mapPresets.allRoutes', 'All Routes', 'en', 'mobile'),
('mapPresets.allRoutesDescription', 'View all available routes', 'en', 'mobile'),
('mapPresets.default', 'Default', 'en', 'mobile'),
('mapPresets.routes', 'routes', 'en', 'mobile'),
('mapPresets.noPresets', 'No presets found', 'en', 'mobile'),
('mapPresets.createFirstPreset', 'Create your first custom preset', 'en', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organize your routes by creating custom map presets like "Summer Routes" or "City Driving".', 'en', 'mobile'),

-- Map Presets Form
('mapPresets.name', 'Preset Name', 'en', 'mobile'),
('mapPresets.namePlaceholder', 'Enter preset name...', 'en', 'mobile'),
('mapPresets.description', 'Description (Optional)', 'en', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Enter description...', 'en', 'mobile'),
('mapPresets.visibility', 'Visibility', 'en', 'mobile'),
('mapPresets.private', 'Private', 'en', 'mobile'),
('mapPresets.public', 'Public', 'en', 'mobile'),
('mapPresets.shared', 'Shared', 'en', 'mobile'),

-- Map Presets Actions
('mapPresets.addToPreset', 'Add to Preset', 'en', 'mobile'),
('mapPresets.removeFromPreset', 'Remove from Preset', 'en', 'mobile'),
('mapPresets.addedToPreset', 'Added to Preset', 'en', 'mobile'),
('mapPresets.removedFromPreset', 'Removed from Preset', 'en', 'mobile'),
('mapPresets.presetCreated', 'Preset Created', 'en', 'mobile'),
('mapPresets.presetUpdated', 'Preset Updated', 'en', 'mobile'),
('mapPresets.presetDeleted', 'Preset Deleted', 'en', 'mobile'),

-- Map Presets Messages
('mapPresets.routeAdded', 'Route has been added to "{presetName}"', 'en', 'mobile'),
('mapPresets.routeRemoved', 'Route has been removed from "{presetName}"', 'en', 'mobile'),
('mapPresets.presetCreatedMessage', 'New preset "{presetName}" has been created and route added to it', 'en', 'mobile'),
('mapPresets.presetUpdatedMessage', 'Preset "{presetName}" has been updated', 'en', 'mobile'),
('mapPresets.presetDeletedMessage', 'Preset "{presetName}" has been deleted', 'en', 'mobile'),
('mapPresets.confirmDelete', 'Are you sure you want to delete this preset?', 'en', 'mobile'),
('mapPresets.deleteWarning', 'This action cannot be undone.', 'en', 'mobile'),

-- Map Presets Errors
('mapPresets.errorLoading', 'Failed to load map presets', 'en', 'mobile'),
('mapPresets.errorCreating', 'Failed to create map preset', 'en', 'mobile'),
('mapPresets.errorUpdating', 'Failed to update map preset', 'en', 'mobile'),
('mapPresets.errorDeleting', 'Failed to delete map preset', 'en', 'mobile'),
('mapPresets.errorAddingRoute', 'Failed to add route to preset', 'en', 'mobile'),
('mapPresets.errorRemovingRoute', 'Failed to remove route from preset', 'en', 'mobile'),
('mapPresets.nameRequired', 'Preset name is required', 'en', 'mobile'),
('mapPresets.nameTooLong', 'Preset name is too long', 'en', 'mobile'),
('mapPresets.descriptionTooLong', 'Description is too long', 'en', 'mobile'),

-- Map Presets Filter
('mapPresets.filterByPreset', 'Filter by Preset', 'en', 'mobile'),
('mapPresets.clearFilters', 'Clear Filters', 'en', 'mobile'),
('mapPresets.activeFilter', 'Active Filter', 'en', 'mobile'),

-- Map Presets Home Screen
('mapPresets.myPresets', 'My Presets', 'en', 'mobile'),
('mapPresets.viewAll', 'View All', 'en', 'mobile'),
('mapPresets.recentPresets', 'Recent Presets', 'en', 'mobile'),
('mapPresets.popularPresets', 'Popular Presets', 'en', 'mobile');

-- ==============================================
-- 9. INSERT SWEDISH TRANSLATIONS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Map Presets General
('mapPresets.title', 'Kartförinställningar', 'sv', 'mobile'),
('mapPresets.description', 'Organisera dina rutter i anpassade samlingar', 'sv', 'mobile'),
('mapPresets.createNew', 'Skapa ny', 'sv', 'mobile'),
('mapPresets.edit', 'Redigera', 'sv', 'mobile'),
('mapPresets.delete', 'Ta bort', 'sv', 'mobile'),
('mapPresets.save', 'Spara', 'sv', 'mobile'),
('mapPresets.cancel', 'Avbryt', 'sv', 'mobile'),
('mapPresets.done', 'Klar', 'sv', 'mobile'),
('mapPresets.loading', 'Laddar...', 'sv', 'mobile'),

-- Map Presets List
('mapPresets.selectPreset', 'Välj förinställning', 'sv', 'mobile'),
('mapPresets.allRoutes', 'Alla rutter', 'sv', 'mobile'),
('mapPresets.allRoutesDescription', 'Visa alla tillgängliga rutter', 'sv', 'mobile'),
('mapPresets.default', 'Standard', 'sv', 'mobile'),
('mapPresets.routes', 'rutter', 'sv', 'mobile'),
('mapPresets.noPresets', 'Inga förinställningar hittades', 'sv', 'mobile'),
('mapPresets.createFirstPreset', 'Skapa din första anpassade förinställning', 'sv', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organisera dina rutter genom att skapa anpassade kartförinställningar som "Sommarutflykter" eller "Stadskörning".', 'sv', 'mobile'),

-- Map Presets Form
('mapPresets.name', 'Förinställningsnamn', 'sv', 'mobile'),
('mapPresets.namePlaceholder', 'Ange förinställningsnamn...', 'sv', 'mobile'),
('mapPresets.description', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Ange beskrivning...', 'sv', 'mobile'),
('mapPresets.visibility', 'Synlighet', 'sv', 'mobile'),
('mapPresets.private', 'Privat', 'sv', 'mobile'),
('mapPresets.public', 'Offentlig', 'sv', 'mobile'),
('mapPresets.shared', 'Delad', 'sv', 'mobile'),

-- Map Presets Actions
('mapPresets.addToPreset', 'Lägg till i förinställning', 'sv', 'mobile'),
('mapPresets.removeFromPreset', 'Ta bort från förinställning', 'sv', 'mobile'),
('mapPresets.addedToPreset', 'Tillagd i förinställning', 'sv', 'mobile'),
('mapPresets.removedFromPreset', 'Borttagen från förinställning', 'sv', 'mobile'),
('mapPresets.presetCreated', 'Förinställning skapad', 'sv', 'mobile'),
('mapPresets.presetUpdated', 'Förinställning uppdaterad', 'sv', 'mobile'),
('mapPresets.presetDeleted', 'Förinställning borttagen', 'sv', 'mobile'),

-- Map Presets Messages
('mapPresets.routeAdded', 'Rutt har lagts till i "{presetName}"', 'sv', 'mobile'),
('mapPresets.routeRemoved', 'Rutt har tagits bort från "{presetName}"', 'sv', 'mobile'),
('mapPresets.presetCreatedMessage', 'Ny förinställning "{presetName}" har skapats och rutt lagts till', 'sv', 'mobile'),
('mapPresets.presetUpdatedMessage', 'Förinställning "{presetName}" har uppdaterats', 'sv', 'mobile'),
('mapPresets.presetDeletedMessage', 'Förinställning "{presetName}" har tagits bort', 'sv', 'mobile'),
('mapPresets.confirmDelete', 'Är du säker på att du vill ta bort denna förinställning?', 'sv', 'mobile'),
('mapPresets.deleteWarning', 'Denna åtgärd kan inte ångras.', 'sv', 'mobile'),

-- Map Presets Errors
('mapPresets.errorLoading', 'Misslyckades att ladda kartförinställningar', 'sv', 'mobile'),
('mapPresets.errorCreating', 'Misslyckades att skapa kartförinställning', 'sv', 'mobile'),
('mapPresets.errorUpdating', 'Misslyckades att uppdatera kartförinställning', 'sv', 'mobile'),
('mapPresets.errorDeleting', 'Misslyckades att ta bort kartförinställning', 'sv', 'mobile'),
('mapPresets.errorAddingRoute', 'Misslyckades att lägga till rutt i förinställning', 'sv', 'mobile'),
('mapPresets.errorRemovingRoute', 'Misslyckades att ta bort rutt från förinställning', 'sv', 'mobile'),
('mapPresets.nameRequired', 'Förinställningsnamn krävs', 'sv', 'mobile'),
('mapPresets.nameTooLong', 'Förinställningsnamn är för långt', 'sv', 'mobile'),
('mapPresets.descriptionTooLong', 'Beskrivning är för lång', 'sv', 'mobile'),

-- Map Presets Filter
('mapPresets.filterByPreset', 'Filtrera efter förinställning', 'sv', 'mobile'),
('mapPresets.clearFilters', 'Rensa filter', 'sv', 'mobile'),
('mapPresets.activeFilter', 'Aktivt filter', 'sv', 'mobile'),

-- Map Presets Home Screen
('mapPresets.myPresets', 'Mina förinställningar', 'sv', 'mobile'),
('mapPresets.viewAll', 'Visa alla', 'sv', 'mobile'),
('mapPresets.recentPresets', 'Senaste förinställningar', 'sv', 'mobile'),
('mapPresets.popularPresets', 'Populära förinställningar', 'sv', 'mobile');

-- ==============================================
-- SETUP COMPLETE!
-- ==============================================
