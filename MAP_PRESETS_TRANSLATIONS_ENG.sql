-- English translations for Map Presets feature
-- Insert English translations for map presets

INSERT INTO translations (key, language, value) VALUES
-- Map Presets General
('mapPresets.title', 'en', 'Map Presets'),
('mapPresets.addToPreset', 'en', 'Add to Preset'),
('mapPresets.createNew', 'en', 'Create New'),
('mapPresets.allRoutes', 'en', 'All Routes'),
('mapPresets.allRoutesDescription', 'en', 'View all available routes'),
('mapPresets.default', 'en', 'Default'),
('mapPresets.routes', 'en', 'routes'),
('mapPresets.name', 'en', 'Preset Name'),
('mapPresets.namePlaceholder', 'en', 'Enter preset name...'),
('mapPresets.description', 'en', 'Description (Optional)'),
('mapPresets.descriptionPlaceholder', 'en', 'Enter description...'),
('mapPresets.visibility', 'en', 'Visibility'),
('mapPresets.private', 'en', 'Private'),
('mapPresets.public', 'en', 'Public'),
('mapPresets.shared', 'en', 'Shared'),
('mapPresets.createFirstPreset', 'en', 'Create your first custom preset'),
('mapPresets.createFirstPresetDescription', 'en', 'Organize your routes by creating custom map presets like "Summer Routes" or "City Driving".'),

-- Map Presets Actions
('mapPresets.addedToPreset', 'en', 'Added to Preset'),
('mapPresets.removedFromPreset', 'en', 'Removed from Preset'),
('mapPresets.presetCreated', 'en', 'Preset Created'),
('mapPresets.presetUpdated', 'en', 'Preset Updated'),
('mapPresets.presetDeleted', 'en', 'Preset Deleted'),
('mapPresets.cannotDeleteDefault', 'en', 'Default presets cannot be deleted'),
('mapPresets.deleteConfirm', 'en', 'Are you sure you want to delete this preset? This action cannot be undone.'),
('mapPresets.deleteTitle', 'en', 'Delete Preset'),

-- Map Presets Errors
('mapPresets.errorLoading', 'en', 'Failed to load map presets'),
('mapPresets.errorSaving', 'en', 'Failed to save map preset'),
('mapPresets.errorDeleting', 'en', 'Failed to delete map preset'),
('mapPresets.errorUpdating', 'en', 'Failed to update map preset'),
('mapPresets.errorAddingRoute', 'en', 'Failed to add route to preset'),
('mapPresets.errorRemovingRoute', 'en', 'Failed to remove route from preset'),

-- Map Presets Success Messages
('mapPresets.routeAddedSuccess', 'en', 'Route has been added to "{presetName}"'),
('mapPresets.routeRemovedSuccess', 'en', 'Route has been removed from "{presetName}"'),
('mapPresets.presetCreatedSuccess', 'en', 'New preset "{presetName}" has been created and route added to it'),
('mapPresets.presetUpdatedSuccess', 'en', 'Preset "{presetName}" has been updated'),
('mapPresets.presetDeletedSuccess', 'en', 'Preset "{presetName}" has been deleted'),

-- Map Presets Validation
('mapPresets.nameRequired', 'en', 'Preset name is required'),
('mapPresets.nameTooLong', 'en', 'Preset name cannot be longer than 50 characters'),
('mapPresets.descriptionTooLong', 'en', 'Description cannot be longer than 200 characters'),

-- Map Presets Info
('mapPresets.noPresets', 'en', 'No presets found'),
('mapPresets.noPresetsDescription', 'en', 'Create your first preset to organize your routes'),
('mapPresets.presetCount', 'en', '{count} presets'),
('mapPresets.routeCount', 'en', '{count} routes'),

-- Map Presets Filter
('mapPresets.filterByPreset', 'en', 'Filter by Preset'),
('mapPresets.selectPreset', 'en', 'Select Preset'),
('mapPresets.clearPresetFilter', 'en', 'Clear Preset Filter'),

-- Map Presets Home Screen
('mapPresets.homeTitle', 'en', 'My Map Presets'),
('mapPresets.homeDescription', 'en', 'Organize your routes in custom presets'),
('mapPresets.homeCreateFirst', 'en', 'Create your first preset'),
('mapPresets.homeViewAll', 'en', 'View All'),

-- Map Presets Navigation
('mapPresets.navigateToMap', 'en', 'Navigate to Map'),
('mapPresets.navigateToMapWithPreset', 'en', 'Navigate to Map with Preset'),
('mapPresets.backToMap', 'en', 'Back to Map'),

-- Map Presets Sharing
('mapPresets.sharePreset', 'en', 'Share Preset'),
('mapPresets.inviteToPreset', 'en', 'Invite to Preset'),
('mapPresets.acceptInvite', 'en', 'Accept Invite'),
('mapPresets.declineInvite', 'en', 'Decline Invite'),

-- Map Presets Settings
('mapPresets.settings', 'en', 'Preset Settings'),
('mapPresets.setAsDefault', 'en', 'Set as Default'),
('mapPresets.removeAsDefault', 'en', 'Remove as Default'),
('mapPresets.exportPreset', 'en', 'Export Preset'),
('mapPresets.importPreset', 'en', 'Import Preset'),

-- Map Presets Help
('mapPresets.help', 'en', 'Help'),
('mapPresets.whatArePresets', 'en', 'What are map presets?'),
('mapPresets.howToCreate', 'en', 'How do I create a preset?'),
('mapPresets.howToShare', 'en', 'How do I share a preset?'),
('mapPresets.howToUse', 'en', 'How do I use presets?')

ON CONFLICT (key, language) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
