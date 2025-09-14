-- Complete Setup Script for Map Presets and Translations
-- Run this script to fix all issues and set up everything properly

-- ==============================================
-- 1. FIX DUPLICATE TRANSLATIONS
-- ==============================================

-- Remove duplicate entries, keeping only the most recent one
DELETE FROM translations 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY key, language, platform 
                   ORDER BY created_at DESC, updated_at DESC
               ) as rn
        FROM translations
        WHERE key = 'mapPresets.description' 
          AND language = 'en' 
          AND platform = 'mobile'
    ) t 
    WHERE rn > 1
);

-- ==============================================
-- 2. DROP EXISTING MAP PRESETS OBJECTS (to avoid conflicts)
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
-- 3. CREATE MAP PRESETS TABLES (in correct order)
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
-- 4. CREATE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_map_presets_creator_id ON map_presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_map_presets_visibility ON map_presets(visibility);
CREATE INDEX IF NOT EXISTS idx_map_presets_is_default ON map_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_preset_id ON map_preset_routes(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_route_id ON map_preset_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);

-- ==============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 6. CREATE RLS POLICIES
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

CREATE POLICY "map_preset_members_all_policy" ON map_preset_members
    FOR ALL USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
    );

-- ==============================================
-- 7. CREATE FUNCTIONS
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
-- 8. CREATE TRIGGERS
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
-- 9. INSERT ALL TRANSLATIONS
-- ==============================================

-- Map Presets English Translations
INSERT INTO translations (key, value, language, platform) VALUES
('mapPresets.title', 'Map Presets', 'en', 'mobile'),
('mapPresets.description', 'Organize your routes into custom collections', 'en', 'mobile'),
('mapPresets.createNew', 'Create New', 'en', 'mobile'),
('mapPresets.edit', 'Edit', 'en', 'mobile'),
('mapPresets.delete', 'Delete', 'en', 'mobile'),
('mapPresets.save', 'Save', 'en', 'mobile'),
('mapPresets.cancel', 'Cancel', 'en', 'mobile'),
('mapPresets.done', 'Done', 'en', 'mobile'),
('mapPresets.loading', 'Loading...', 'en', 'mobile'),
('mapPresets.selectPreset', 'Select Preset', 'en', 'mobile'),
('mapPresets.allRoutes', 'All Routes', 'en', 'mobile'),
('mapPresets.allRoutesDescription', 'View all available routes', 'en', 'mobile'),
('mapPresets.default', 'Default', 'en', 'mobile'),
('mapPresets.routes', 'routes', 'en', 'mobile'),
('mapPresets.noPresets', 'No presets found', 'en', 'mobile'),
('mapPresets.createFirstPreset', 'Create your first custom preset', 'en', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organize your routes by creating custom map presets like "Summer Routes" or "City Driving".', 'en', 'mobile'),
('mapPresets.name', 'Preset Name', 'en', 'mobile'),
('mapPresets.namePlaceholder', 'Enter preset name...', 'en', 'mobile'),
('mapPresets.description', 'Description (Optional)', 'en', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Enter description...', 'en', 'mobile'),
('mapPresets.visibility', 'Visibility', 'en', 'mobile'),
('mapPresets.private', 'Private', 'en', 'mobile'),
('mapPresets.public', 'Public', 'en', 'mobile'),
('mapPresets.shared', 'Shared', 'en', 'mobile'),
('mapPresets.addToPreset', 'Add to Preset', 'en', 'mobile'),
('mapPresets.removeFromPreset', 'Remove from Preset', 'en', 'mobile'),
('mapPresets.addedToPreset', 'Added to Preset', 'en', 'mobile'),
('mapPresets.removedFromPreset', 'Removed from Preset', 'en', 'mobile'),
('mapPresets.presetCreated', 'Preset Created', 'en', 'mobile'),
('mapPresets.presetUpdated', 'Preset Updated', 'en', 'mobile'),
('mapPresets.presetDeleted', 'Preset Deleted', 'en', 'mobile'),
('mapPresets.errorCreating', 'Error creating preset', 'en', 'mobile'),
('mapPresets.errorUpdating', 'Error updating preset', 'en', 'mobile'),
('mapPresets.errorDeleting', 'Error deleting preset', 'en', 'mobile'),
('mapPresets.errorLoading', 'Error loading presets', 'en', 'mobile'),
('mapPresets.nameRequired', 'Preset name is required', 'en', 'mobile'),
('mapPresets.nameTooLong', 'Preset name is too long', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Map Presets Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
('mapPresets.title', 'Kartförinställningar', 'sv', 'mobile'),
('mapPresets.description', 'Organisera dina rutter i anpassade samlingar', 'sv', 'mobile'),
('mapPresets.createNew', 'Skapa ny', 'sv', 'mobile'),
('mapPresets.edit', 'Redigera', 'sv', 'mobile'),
('mapPresets.delete', 'Ta bort', 'sv', 'mobile'),
('mapPresets.save', 'Spara', 'sv', 'mobile'),
('mapPresets.cancel', 'Avbryt', 'sv', 'mobile'),
('mapPresets.done', 'Klar', 'sv', 'mobile'),
('mapPresets.loading', 'Laddar...', 'sv', 'mobile'),
('mapPresets.selectPreset', 'Välj förinställning', 'sv', 'mobile'),
('mapPresets.allRoutes', 'Alla rutter', 'sv', 'mobile'),
('mapPresets.allRoutesDescription', 'Visa alla tillgängliga rutter', 'sv', 'mobile'),
('mapPresets.default', 'Standard', 'sv', 'mobile'),
('mapPresets.routes', 'rutter', 'sv', 'mobile'),
('mapPresets.noPresets', 'Inga förinställningar hittades', 'sv', 'mobile'),
('mapPresets.createFirstPreset', 'Skapa din första anpassade förinställning', 'sv', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organisera dina rutter genom att skapa anpassade kartförinställningar som "Sommarutflykter" eller "Stadskörning".', 'sv', 'mobile'),
('mapPresets.name', 'Förinställningsnamn', 'sv', 'mobile'),
('mapPresets.namePlaceholder', 'Ange förinställningsnamn...', 'sv', 'mobile'),
('mapPresets.description', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Ange beskrivning...', 'sv', 'mobile'),
('mapPresets.visibility', 'Synlighet', 'sv', 'mobile'),
('mapPresets.private', 'Privat', 'sv', 'mobile'),
('mapPresets.public', 'Offentlig', 'sv', 'mobile'),
('mapPresets.shared', 'Delad', 'sv', 'mobile'),
('mapPresets.addToPreset', 'Lägg till i förinställning', 'sv', 'mobile'),
('mapPresets.removeFromPreset', 'Ta bort från förinställning', 'sv', 'mobile'),
('mapPresets.addedToPreset', 'Tillagd i förinställning', 'sv', 'mobile'),
('mapPresets.removedFromPreset', 'Borttagen från förinställning', 'sv', 'mobile'),
('mapPresets.presetCreated', 'Förinställning skapad', 'sv', 'mobile'),
('mapPresets.presetUpdated', 'Förinställning uppdaterad', 'sv', 'mobile'),
('mapPresets.presetDeleted', 'Förinställning borttagen', 'sv', 'mobile'),
('mapPresets.errorCreating', 'Fel vid skapande av förinställning', 'sv', 'mobile'),
('mapPresets.errorUpdating', 'Fel vid uppdatering av förinställning', 'sv', 'mobile'),
('mapPresets.errorDeleting', 'Fel vid borttagning av förinställning', 'sv', 'mobile'),
('mapPresets.errorLoading', 'Fel vid laddning av förinställningar', 'sv', 'mobile'),
('mapPresets.nameRequired', 'Förinställningsnamn krävs', 'sv', 'mobile'),
('mapPresets.nameTooLong', 'Förinställningsnamn är för långt', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Communication Tools English Translations
INSERT INTO translations (key, value, language, platform) VALUES
('home.communication', 'Communication', 'en', 'mobile'),
('communication.messages', 'Messages', 'en', 'mobile'),
('communication.notifications', 'Notifications', 'en', 'mobile'),
('communication.events', 'Events', 'en', 'mobile'),
('communication.newMessages', 'new', 'en', 'mobile'),
('communication.newNotifications', 'new', 'en', 'mobile'),
('communication.newEvents', 'new', 'en', 'mobile'),
('communication.viewMessages', 'View Messages', 'en', 'mobile'),
('communication.viewNotifications', 'View Notifications', 'en', 'mobile'),
('communication.viewEvents', 'View Events', 'en', 'mobile'),
('communication.messagesDescription', 'Chat with instructors and students', 'en', 'mobile'),
('communication.notificationsDescription', 'Stay updated with app notifications', 'en', 'mobile'),
('communication.eventsDescription', 'Join driving events and meetups', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Communication Tools Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
('home.communication', 'Kommunikation', 'sv', 'mobile'),
('communication.messages', 'Meddelanden', 'sv', 'mobile'),
('communication.notifications', 'Notifieringar', 'sv', 'mobile'),
('communication.events', 'Evenemang', 'sv', 'mobile'),
('communication.newMessages', 'nya', 'sv', 'mobile'),
('communication.newNotifications', 'nya', 'sv', 'mobile'),
('communication.newEvents', 'nya', 'sv', 'mobile'),
('communication.viewMessages', 'Visa meddelanden', 'sv', 'mobile'),
('communication.viewNotifications', 'Visa notifieringar', 'sv', 'mobile'),
('communication.viewEvents', 'Visa evenemang', 'sv', 'mobile'),
('communication.messagesDescription', 'Chatta med instruktörer och elever', 'sv', 'mobile'),
('communication.notificationsDescription', 'Håll dig uppdaterad med appnotifieringar', 'sv', 'mobile'),
('communication.eventsDescription', 'Delta i körutbildningsevenemang och träffar', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
