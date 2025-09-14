-- Swedish translations for Map Presets feature
-- Insert Swedish translations for map presets

INSERT INTO translations (key, language, value) VALUES
-- Map Presets General
('mapPresets.title', 'sv', 'Kartförinställningar'),
('mapPresets.addToPreset', 'sv', 'Lägg till i förinställning'),
('mapPresets.createNew', 'sv', 'Skapa ny'),
('mapPresets.allRoutes', 'sv', 'Alla rutter'),
('mapPresets.allRoutesDescription', 'sv', 'Visa alla tillgängliga rutter'),
('mapPresets.default', 'sv', 'Standard'),
('mapPresets.routes', 'sv', 'rutter'),
('mapPresets.name', 'sv', 'Förinställningsnamn'),
('mapPresets.namePlaceholder', 'sv', 'Ange förinställningsnamn...'),
('mapPresets.description', 'sv', 'Beskrivning (valfritt)'),
('mapPresets.descriptionPlaceholder', 'sv', 'Ange beskrivning...'),
('mapPresets.visibility', 'sv', 'Synlighet'),
('mapPresets.private', 'sv', 'Privat'),
('mapPresets.public', 'sv', 'Offentlig'),
('mapPresets.shared', 'sv', 'Delad'),
('mapPresets.createFirstPreset', 'sv', 'Skapa din första anpassade förinställning'),
('mapPresets.createFirstPresetDescription', 'sv', 'Organisera dina rutter genom att skapa anpassade kartförinställningar som "Sommarutrutter" eller "Stadskörning".'),

-- Map Presets Actions
('mapPresets.addedToPreset', 'sv', 'Lagt till i förinställning'),
('mapPresets.removedFromPreset', 'sv', 'Borttagen från förinställning'),
('mapPresets.presetCreated', 'sv', 'Förinställning skapad'),
('mapPresets.presetUpdated', 'sv', 'Förinställning uppdaterad'),
('mapPresets.presetDeleted', 'sv', 'Förinställning borttagen'),
('mapPresets.cannotDeleteDefault', 'sv', 'Standardförinställningar kan inte tas bort'),
('mapPresets.deleteConfirm', 'sv', 'Är du säker på att du vill ta bort denna förinställning? Denna åtgärd kan inte ångras.'),
('mapPresets.deleteTitle', 'sv', 'Ta bort förinställning'),

-- Map Presets Errors
('mapPresets.errorLoading', 'sv', 'Kunde inte ladda kartförinställningar'),
('mapPresets.errorSaving', 'sv', 'Kunde inte spara kartförinställning'),
('mapPresets.errorDeleting', 'sv', 'Kunde inte ta bort kartförinställning'),
('mapPresets.errorUpdating', 'sv', 'Kunde inte uppdatera kartförinställning'),
('mapPresets.errorAddingRoute', 'sv', 'Kunde inte lägga till rutt i förinställning'),
('mapPresets.errorRemovingRoute', 'sv', 'Kunde inte ta bort rutt från förinställning'),

-- Map Presets Success Messages
('mapPresets.routeAddedSuccess', 'sv', 'Rutt har lagts till i "{presetName}"'),
('mapPresets.routeRemovedSuccess', 'sv', 'Rutt har tagits bort från "{presetName}"'),
('mapPresets.presetCreatedSuccess', 'sv', 'Ny förinställning "{presetName}" har skapats och rutt lagts till i den'),
('mapPresets.presetUpdatedSuccess', 'sv', 'Förinställning "{presetName}" har uppdaterats'),
('mapPresets.presetDeletedSuccess', 'sv', 'Förinställning "{presetName}" har tagits bort'),

-- Map Presets Validation
('mapPresets.nameRequired', 'sv', 'Förinställningsnamn krävs'),
('mapPresets.nameTooLong', 'sv', 'Förinställningsnamn får inte vara längre än 50 tecken'),
('mapPresets.descriptionTooLong', 'sv', 'Beskrivning får inte vara längre än 200 tecken'),

-- Map Presets Info
('mapPresets.noPresets', 'sv', 'Inga förinställningar hittades'),
('mapPresets.noPresetsDescription', 'sv', 'Skapa din första förinställning för att organisera dina rutter'),
('mapPresets.presetCount', 'sv', '{count} förinställningar'),
('mapPresets.routeCount', 'sv', '{count} rutter'),

-- Map Presets Filter
('mapPresets.filterByPreset', 'sv', 'Filtrera efter förinställning'),
('mapPresets.selectPreset', 'sv', 'Välj förinställning'),
('mapPresets.clearPresetFilter', 'sv', 'Rensa förinställningsfilter'),

-- Map Presets Home Screen
('mapPresets.homeTitle', 'sv', 'Mina kartförinställningar'),
('mapPresets.homeDescription', 'sv', 'Organisera dina rutter i anpassade förinställningar'),
('mapPresets.homeCreateFirst', 'sv', 'Skapa din första förinställning'),
('mapPresets.homeViewAll', 'sv', 'Visa alla'),

-- Map Presets Navigation
('mapPresets.navigateToMap', 'sv', 'Navigera till karta'),
('mapPresets.navigateToMapWithPreset', 'sv', 'Navigera till karta med förinställning'),
('mapPresets.backToMap', 'sv', 'Tillbaka till karta'),

-- Map Presets Sharing
('mapPresets.sharePreset', 'sv', 'Dela förinställning'),
('mapPresets.inviteToPreset', 'sv', 'Bjud in till förinställning'),
('mapPresets.acceptInvite', 'sv', 'Acceptera inbjudan'),
('mapPresets.declineInvite', 'sv', 'Avslå inbjudan'),

-- Map Presets Settings
('mapPresets.settings', 'sv', 'Förinställningsinställningar'),
('mapPresets.setAsDefault', 'sv', 'Ange som standard'),
('mapPresets.removeAsDefault', 'sv', 'Ta bort som standard'),
('mapPresets.exportPreset', 'sv', 'Exportera förinställning'),
('mapPresets.importPreset', 'sv', 'Importera förinställning'),

-- Map Presets Help
('mapPresets.help', 'sv', 'Hjälp'),
('mapPresets.whatArePresets', 'sv', 'Vad är kartförinställningar?'),
('mapPresets.howToCreate', 'sv', 'Hur skapar jag en förinställning?'),
('mapPresets.howToShare', 'sv', 'Hur delar jag en förinställning?'),
('mapPresets.howToUse', 'sv', 'Hur använder jag förinställningar?')

ON CONFLICT (key, language) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
