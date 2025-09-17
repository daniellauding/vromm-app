-- MISSING TRANSLATIONS FIX
-- This adds all the missing translation keys that are showing as raw keys in the app

-- ==============================================
-- ENGLISH TRANSLATIONS - MISSING KEYS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Missing Map Presets Keys
('mapPresets.addToPreset', 'Add to Preset', 'en', 'mobile'),
('mapPresets.allRoutes', 'All Routes', 'en', 'mobile'),
('mapPresets.allRoutesDescription', 'View all available routes', 'en', 'mobile'),
('mapPresets.createFirstPreset', 'Create your first custom preset', 'en', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organize your routes by creating custom map presets like "Summer Routes" or "City Driving".', 'en', 'mobile'),
('mapPresets.createNew', 'Create New', 'en', 'mobile'),
('mapPresets.myPresets', 'My Presets', 'en', 'mobile'),
('mapPresets.noPresets', 'No presets found', 'en', 'mobile'),
('mapPresets.createFirst', 'Create your first preset', 'en', 'mobile'),

-- Common Keys
('common.done', 'Done', 'en', 'mobile'),
('common.cancel', 'Cancel', 'en', 'mobile'),

-- Map Presets General
('mapPresets.title', 'Map Presets', 'en', 'mobile'),
('mapPresets.description', 'Organize your routes into custom collections', 'en', 'mobile'),
('mapPresets.edit', 'Edit', 'en', 'mobile'),
('mapPresets.delete', 'Delete', 'en', 'mobile'),
('mapPresets.save', 'Save', 'en', 'mobile'),
('mapPresets.loading', 'Loading...', 'en', 'mobile'),
('mapPresets.selectPreset', 'Select Preset', 'en', 'mobile'),
('mapPresets.default', 'Default', 'en', 'mobile'),
('mapPresets.routes', 'routes', 'en', 'mobile'),

-- Map Presets Form
('mapPresets.name', 'Preset Name', 'en', 'mobile'),
('mapPresets.namePlaceholder', 'Enter preset name...', 'en', 'mobile'),
('mapPresets.descriptionLabel', 'Description (Optional)', 'en', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Enter description...', 'en', 'mobile'),
('mapPresets.visibility', 'Visibility', 'en', 'mobile'),
('mapPresets.private', 'Private', 'en', 'mobile'),
('mapPresets.public', 'Public', 'en', 'mobile'),
('mapPresets.shared', 'Shared', 'en', 'mobile'),

-- Map Presets Actions
('mapPresets.removeFromPreset', 'Remove from Preset', 'en', 'mobile'),
('mapPresets.addedToPreset', 'Added to Preset', 'en', 'mobile'),
('mapPresets.removedFromPreset', 'Removed from Preset', 'en', 'mobile'),
('mapPresets.presetCreated', 'Preset Created', 'en', 'mobile'),
('mapPresets.presetUpdated', 'Preset Updated', 'en', 'mobile'),
('mapPresets.presetDeleted', 'Preset Deleted', 'en', 'mobile'),

-- Map Presets Errors
('mapPresets.errorCreating', 'Error creating preset', 'en', 'mobile'),
('mapPresets.errorUpdating', 'Error updating preset', 'en', 'mobile'),
('mapPresets.errorDeleting', 'Error deleting preset', 'en', 'mobile'),
('mapPresets.errorLoading', 'Error loading presets', 'en', 'mobile'),
('mapPresets.nameRequired', 'Preset name is required', 'en', 'mobile'),
('mapPresets.nameTooLong', 'Preset name is too long', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ==============================================
-- SWEDISH TRANSLATIONS - MISSING KEYS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Missing Map Presets Keys
('mapPresets.addToPreset', 'Lägg till i förinställning', 'sv', 'mobile'),
('mapPresets.allRoutes', 'Alla rutter', 'sv', 'mobile'),
('mapPresets.allRoutesDescription', 'Visa alla tillgängliga rutter', 'sv', 'mobile'),
('mapPresets.createFirstPreset', 'Skapa din första anpassade förinställning', 'sv', 'mobile'),
('mapPresets.createFirstPresetDescription', 'Organisera dina rutter genom att skapa anpassade kartförinställningar som "Sommarutflykter" eller "Stadskörning".', 'sv', 'mobile'),
('mapPresets.createNew', 'Skapa ny', 'sv', 'mobile'),
('mapPresets.myPresets', 'Mina förinställningar', 'sv', 'mobile'),
('mapPresets.noPresets', 'Inga förinställningar hittades', 'sv', 'mobile'),
('mapPresets.createFirst', 'Skapa din första förinställning', 'sv', 'mobile'),

-- Common Keys
('common.done', 'Klar', 'sv', 'mobile'),
('common.cancel', 'Avbryt', 'sv', 'mobile'),

-- Map Presets General
('mapPresets.title', 'Kartförinställningar', 'sv', 'mobile'),
('mapPresets.description', 'Organisera dina rutter i anpassade samlingar', 'sv', 'mobile'),
('mapPresets.edit', 'Redigera', 'sv', 'mobile'),
('mapPresets.delete', 'Ta bort', 'sv', 'mobile'),
('mapPresets.save', 'Spara', 'sv', 'mobile'),
('mapPresets.loading', 'Laddar...', 'sv', 'mobile'),
('mapPresets.selectPreset', 'Välj förinställning', 'sv', 'mobile'),
('mapPresets.default', 'Standard', 'sv', 'mobile'),
('mapPresets.routes', 'rutter', 'sv', 'mobile'),

-- Map Presets Form
('mapPresets.name', 'Förinställningsnamn', 'sv', 'mobile'),
('mapPresets.namePlaceholder', 'Ange förinställningsnamn...', 'sv', 'mobile'),
('mapPresets.descriptionLabel', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
('mapPresets.descriptionPlaceholder', 'Ange beskrivning...', 'sv', 'mobile'),
('mapPresets.visibility', 'Synlighet', 'sv', 'mobile'),
('mapPresets.private', 'Privat', 'sv', 'mobile'),
('mapPresets.public', 'Offentlig', 'sv', 'mobile'),
('mapPresets.shared', 'Delad', 'sv', 'mobile'),

-- Map Presets Actions
('mapPresets.removeFromPreset', 'Ta bort från förinställning', 'sv', 'mobile'),
('mapPresets.addedToPreset', 'Tillagd i förinställning', 'sv', 'mobile'),
('mapPresets.removedFromPreset', 'Borttagen från förinställning', 'sv', 'mobile'),
('mapPresets.presetCreated', 'Förinställning skapad', 'sv', 'mobile'),
('mapPresets.presetUpdated', 'Förinställning uppdaterad', 'sv', 'mobile'),
('mapPresets.presetDeleted', 'Förinställning borttagen', 'sv', 'mobile'),

-- Map Presets Errors
('mapPresets.errorCreating', 'Fel vid skapande av förinställning', 'sv', 'mobile'),
('mapPresets.errorUpdating', 'Fel vid uppdatering av förinställning', 'sv', 'mobile'),
('mapPresets.errorDeleting', 'Fel vid borttagning av förinställning', 'sv', 'mobile'),
('mapPresets.errorLoading', 'Fel vid laddning av förinställningar', 'sv', 'mobile'),
('mapPresets.nameRequired', 'Förinställningsnamn krävs', 'sv', 'mobile'),
('mapPresets.nameTooLong', 'Förinställningsnamn är för långt', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
