-- Map Presets Swedish Translations
-- Copy and paste this into your Supabase SQL editor

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
('mapPresets.popularPresets', 'Populära förinställningar', 'sv', 'mobile'),

-- Common words that might be used
('common.create', 'Skapa', 'sv', 'mobile'),
('common.edit', 'Redigera', 'sv', 'mobile'),
('common.delete', 'Ta bort', 'sv', 'mobile'),
('common.save', 'Spara', 'sv', 'mobile'),
('common.cancel', 'Avbryt', 'sv', 'mobile'),
('common.done', 'Klar', 'sv', 'mobile'),
('common.loading', 'Laddar...', 'sv', 'mobile'),
('common.error', 'Fel', 'sv', 'mobile'),
('common.success', 'Framgång', 'sv', 'mobile'),
('common.confirm', 'Bekräfta', 'sv', 'mobile'),
('common.yes', 'Ja', 'sv', 'mobile'),
('common.no', 'Nej', 'sv', 'mobile');