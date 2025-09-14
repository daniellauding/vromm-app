-- Map Presets English Translations
-- Copy and paste this into your Supabase SQL editor

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
('mapPresets.popularPresets', 'Popular Presets', 'en', 'mobile'),

-- Common words that might be used
('common.create', 'Create', 'en', 'mobile'),
('common.edit', 'Edit', 'en', 'mobile'),
('common.delete', 'Delete', 'en', 'mobile'),
('common.save', 'Save', 'en', 'mobile'),
('common.cancel', 'Cancel', 'en', 'mobile'),
('common.done', 'Done', 'en', 'mobile'),
('common.loading', 'Loading...', 'en', 'mobile'),
('common.error', 'Error', 'en', 'mobile'),
('common.success', 'Success', 'en', 'mobile'),
('common.confirm', 'Confirm', 'en', 'mobile'),
('common.yes', 'Yes', 'en', 'mobile'),
('common.no', 'No', 'en', 'mobile');