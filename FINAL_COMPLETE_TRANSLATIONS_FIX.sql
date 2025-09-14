-- FINAL COMPLETE TRANSLATIONS FIX
-- This script fixes ALL translation issues in one go

-- ==============================================
-- STEP 1: FIX DUPLICATE TRANSLATIONS
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
-- STEP 2: CREATE MAP PRESETS SCHEMA (if needed)
-- ==============================================

-- Drop existing policies if they exist (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_presets') THEN
        DROP POLICY IF EXISTS "map_presets_select_policy" ON map_presets;
        DROP POLICY IF EXISTS "map_presets_insert_policy" ON map_presets;
        DROP POLICY IF EXISTS "map_presets_update_policy" ON map_presets;
        DROP POLICY IF EXISTS "map_presets_delete_policy" ON map_presets;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_routes') THEN
        DROP POLICY IF EXISTS "map_preset_routes_select_policy" ON map_preset_routes;
        DROP POLICY IF EXISTS "map_preset_routes_insert_policy" ON map_preset_routes;
        DROP POLICY IF EXISTS "map_preset_routes_delete_policy" ON map_preset_routes;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_members') THEN
        DROP POLICY IF EXISTS "map_preset_members_select_policy" ON map_preset_members;
        DROP POLICY IF EXISTS "map_preset_members_all_policy" ON map_preset_members;
    END IF;
END $$;

-- Drop existing triggers if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_presets') THEN
        DROP TRIGGER IF EXISTS update_map_presets_updated_at ON map_presets;
    END IF;
END $$;

DROP TRIGGER IF EXISTS create_default_preset_trigger ON auth.users;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_default_preset_for_user();
-- Note: update_updated_at_column() is used by many other tables, so we don't drop it
DROP FUNCTION IF EXISTS get_preset_route_count(UUID);
DROP FUNCTION IF EXISTS user_has_preset_access(UUID, UUID);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_map_presets_creator_id ON map_presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_map_presets_visibility ON map_presets(visibility);
CREATE INDEX IF NOT EXISTS idx_map_presets_is_default ON map_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_preset_id ON map_preset_routes(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_routes_route_id ON map_preset_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);

-- Enable RLS
ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
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

CREATE POLICY "map_preset_members_select_policy" ON map_preset_members
    FOR SELECT USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE 
            creator_id = auth.uid() OR 
            visibility = 'public'
        ) OR
        user_id = auth.uid()
    );

CREATE POLICY "map_preset_members_all_policy" ON map_preset_members
    FOR ALL USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
    );

-- Create Functions
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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create Triggers
CREATE TRIGGER create_default_preset_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_preset_for_user();

CREATE TRIGGER update_map_presets_updated_at
    BEFORE UPDATE ON map_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- STEP 3: INSERT ALL TRANSLATIONS
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
('mapPresets.descriptionLabel', 'Description (Optional)', 'en', 'mobile'),
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
('mapPresets.nameTooLong', 'Preset name is too long', 'en', 'mobile'),
('mapPresets.myPresets', 'My Presets', 'en', 'mobile'),
('mapPresets.createFirst', 'Create your first preset', 'en', 'mobile')

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
('mapPresets.descriptionLabel', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
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
('mapPresets.nameTooLong', 'Förinställningsnamn är för långt', 'sv', 'mobile'),
('mapPresets.myPresets', 'Mina förinställningar', 'sv', 'mobile'),
('mapPresets.createFirst', 'Skapa din första förinställning', 'sv', 'mobile')

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

-- Route Detail English Translations
INSERT INTO translations (key, value, language, platform) VALUES
('routeDetail.loading', 'Loading route data...', 'en', 'mobile'),
('routeDetail.routeNotFound', 'Route not found', 'en', 'mobile'),
('routeDetail.routeOptions', 'Route Options', 'en', 'mobile'),
('routeDetail.openInMaps', 'Open in Maps', 'en', 'mobile'),
('routeDetail.shareRoute', 'Share Route', 'en', 'mobile'),
('routeDetail.deleteRoute', 'Delete Route', 'en', 'mobile'),
('routeDetail.reportRoute', 'Report Route', 'en', 'mobile'),
('routeDetail.exercises', 'Exercises', 'en', 'mobile'),
('routeDetail.yourProgress', 'Your Progress', 'en', 'mobile'),
('routeDetail.completed', 'Completed', 'en', 'mobile'),
('routeDetail.startRoute', 'Start Route', 'en', 'mobile'),
('routeDetail.saveRoute', 'Save Route', 'en', 'mobile'),
('routeDetail.saved', 'Saved', 'en', 'mobile'),
('routeDetail.addToPreset', 'Add to Preset', 'en', 'mobile'),
('routeDetail.markAsDriven', 'Mark as Driven', 'en', 'mobile'),
('routeDetail.markedAsDriven', 'Marked as Driven', 'en', 'mobile'),
('routeDetail.recordingStats', 'Recording Stats', 'en', 'mobile'),
('routeDetail.recordedWithGPS', 'Recorded with live GPS tracking', 'en', 'mobile'),
('routeDetail.comments', 'Comments', 'en', 'mobile'),
('routeDetail.addNewReview', 'Add New Review', 'en', 'mobile'),
('routeDetail.unmarkAsDriven', 'Unmark as Driven', 'en', 'mobile'),
('routeDetail.routeReview', 'Route Review', 'en', 'mobile'),
('routeDetail.whatWouldYouLikeToDo', 'What would you like to do?', 'en', 'mobile'),
('routeDetail.addedToPreset', 'Added to Preset', 'en', 'mobile'),
('routeDetail.removedFromPreset', 'Removed from Preset', 'en', 'mobile'),
('routeDetail.presetCreated', 'Preset Created', 'en', 'mobile'),
('routeDetail.routeHasBeenAdded', 'Route has been added to "{presetName}"', 'en', 'mobile'),
('routeDetail.routeHasBeenRemoved', 'Route has been removed from "{presetName}"', 'en', 'mobile'),
('routeDetail.newPresetCreated', 'New preset "{presetName}" has been created and route added to it', 'en', 'mobile'),
('routeDetail.signInRequired', 'Sign in required', 'en', 'mobile'),
('routeDetail.pleaseSignInToSave', 'Please sign in to save routes', 'en', 'mobile'),
('routeDetail.pleaseSignInToAdd', 'Please sign in to add routes to presets', 'en', 'mobile'),
('routeDetail.pleaseSignInToMark', 'Please sign in to mark this route as driven', 'en', 'mobile'),
('routeDetail.unableToDelete', 'Unable to delete route', 'en', 'mobile'),
('routeDetail.deleteRouteConfirm', 'Are you sure you want to delete this route? This action cannot be undone.', 'en', 'mobile'),
('routeDetail.deleteRouteTitle', 'Delete Route', 'en', 'mobile'),
('routeDetail.failedToDelete', 'Failed to delete route', 'en', 'mobile'),
('routeDetail.failedToUpdateSave', 'Failed to update save status', 'en', 'mobile'),
('routeDetail.failedToUnmark', 'Failed to unmark route as driven', 'en', 'mobile'),
('routeDetail.routeUnmarkedAsDriven', 'Route unmarked as driven', 'en', 'mobile'),
('routeDetail.failedToShare', 'Failed to share route', 'en', 'mobile'),
('routeDetail.noWaypointsAvailable', 'No waypoints available for this route', 'en', 'mobile'),
('routeDetail.adminDeleteTitle', 'Admin: Delete Route', 'en', 'mobile'),
('routeDetail.adminDeleteConfirm', 'Are you sure you want to delete this route as an admin? This action cannot be undone.', 'en', 'mobile'),
('routeDetail.routeDeletedByAdmin', 'Route deleted by admin', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Route Detail Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
('routeDetail.loading', 'Laddar ruttdata...', 'sv', 'mobile'),
('routeDetail.routeNotFound', 'Rutt hittades inte', 'sv', 'mobile'),
('routeDetail.routeOptions', 'Ruttalternativ', 'sv', 'mobile'),
('routeDetail.openInMaps', 'Öppna i kartor', 'sv', 'mobile'),
('routeDetail.shareRoute', 'Dela rutt', 'sv', 'mobile'),
('routeDetail.deleteRoute', 'Ta bort rutt', 'sv', 'mobile'),
('routeDetail.reportRoute', 'Rapportera rutt', 'sv', 'mobile'),
('routeDetail.exercises', 'Övningar', 'sv', 'mobile'),
('routeDetail.yourProgress', 'Din framsteg', 'sv', 'mobile'),
('routeDetail.completed', 'Slutförd', 'sv', 'mobile'),
('routeDetail.startRoute', 'Starta rutt', 'sv', 'mobile'),
('routeDetail.saveRoute', 'Spara rutt', 'sv', 'mobile'),
('routeDetail.saved', 'Sparad', 'sv', 'mobile'),
('routeDetail.addToPreset', 'Lägg till i förinställning', 'sv', 'mobile'),
('routeDetail.markAsDriven', 'Markera som körd', 'sv', 'mobile'),
('routeDetail.markedAsDriven', 'Markerad som körd', 'sv', 'mobile'),
('routeDetail.recordingStats', 'Inspelningsstatistik', 'sv', 'mobile'),
('routeDetail.recordedWithGPS', 'Inspelad med live GPS-spårning', 'sv', 'mobile'),
('routeDetail.comments', 'Kommentarer', 'sv', 'mobile'),
('routeDetail.addNewReview', 'Lägg till ny recension', 'sv', 'mobile'),
('routeDetail.unmarkAsDriven', 'Avmarkera som körd', 'sv', 'mobile'),
('routeDetail.routeReview', 'Ruttrecension', 'sv', 'mobile'),
('routeDetail.whatWouldYouLikeToDo', 'Vad vill du göra?', 'sv', 'mobile'),
('routeDetail.addedToPreset', 'Tillagd i förinställning', 'sv', 'mobile'),
('routeDetail.removedFromPreset', 'Borttagen från förinställning', 'sv', 'mobile'),
('routeDetail.presetCreated', 'Förinställning skapad', 'sv', 'mobile'),
('routeDetail.routeHasBeenAdded', 'Rutt har lagts till i "{presetName}"', 'sv', 'mobile'),
('routeDetail.routeHasBeenRemoved', 'Rutt har tagits bort från "{presetName}"', 'sv', 'mobile'),
('routeDetail.newPresetCreated', 'Ny förinställning "{presetName}" har skapats och rutt lagts till i den', 'sv', 'mobile'),
('routeDetail.signInRequired', 'Inloggning krävs', 'sv', 'mobile'),
('routeDetail.pleaseSignInToSave', 'Vänligen logga in för att spara rutter', 'sv', 'mobile'),
('routeDetail.pleaseSignInToAdd', 'Vänligen logga in för att lägga till rutter i förinställningar', 'sv', 'mobile'),
('routeDetail.pleaseSignInToMark', 'Vänligen logga in för att markera denna rutt som körd', 'sv', 'mobile'),
('routeDetail.unableToDelete', 'Kan inte ta bort rutt', 'sv', 'mobile'),
('routeDetail.deleteRouteConfirm', 'Är du säker på att du vill ta bort denna rutt? Denna åtgärd kan inte ångras.', 'sv', 'mobile'),
('routeDetail.deleteRouteTitle', 'Ta bort rutt', 'sv', 'mobile'),
('routeDetail.failedToDelete', 'Misslyckades att ta bort rutt', 'sv', 'mobile'),
('routeDetail.failedToUpdateSave', 'Misslyckades att uppdatera sparstatus', 'sv', 'mobile'),
('routeDetail.failedToUnmark', 'Misslyckades att avmarkera rutt som körd', 'sv', 'mobile'),
('routeDetail.routeUnmarkedAsDriven', 'Rutt avmarkerad som körd', 'sv', 'mobile'),
('routeDetail.failedToShare', 'Misslyckades att dela rutt', 'sv', 'mobile'),
('routeDetail.noWaypointsAvailable', 'Inga vägpunkter tillgängliga för denna rutt', 'sv', 'mobile'),
('routeDetail.adminDeleteTitle', 'Admin: Ta bort rutt', 'sv', 'mobile'),
('routeDetail.adminDeleteConfirm', 'Är du säker på att du vill ta bort denna rutt som admin? Denna åtgärd kan inte ångras.', 'sv', 'mobile'),
('routeDetail.routeDeletedByAdmin', 'Rutt borttagen av admin', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Common English Translations
INSERT INTO translations (key, value, language, platform) VALUES
('common.goBack', 'Go Back', 'en', 'mobile'),
('common.cancel', 'Cancel', 'en', 'mobile'),
('common.delete', 'Delete', 'en', 'mobile'),
('common.ok', 'OK', 'en', 'mobile'),
('common.success', 'Success', 'en', 'mobile'),
('common.error', 'Error', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Virtual Preset Messages
INSERT INTO translations (key, value, language, platform) VALUES
('mapPresets.virtualPreset', 'Virtual Preset', 'en', 'mobile'),
('mapPresets.virtualPresetMessage', 'This is a virtual preset that shows all routes. You cannot add or remove routes from it.', 'en', 'mobile'),
('mapPresets.virtualPreset', 'Virtuell Förinställning', 'sv', 'mobile'),
('mapPresets.virtualPresetMessage', 'Detta är en virtuell förinställning som visar alla rutter. Du kan inte lägga till eller ta bort rutter från den.', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Common Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
('common.goBack', 'Gå tillbaka', 'sv', 'mobile'),
('common.cancel', 'Avbryt', 'sv', 'mobile'),
('common.delete', 'Ta bort', 'sv', 'mobile'),
('common.ok', 'OK', 'sv', 'mobile'),
('common.success', 'Framgång', 'sv', 'mobile'),
('common.error', 'Fel', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
