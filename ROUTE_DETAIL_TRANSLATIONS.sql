-- Route Detail Sheet Translations
-- Swedish and English translations for the RouteDetailSheet component

-- ==============================================
-- ENGLISH TRANSLATIONS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Route Detail General
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

-- Route Detail Actions
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

-- Route Detail Errors
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
('routeDetail.routeDeletedByAdmin', 'Route deleted by admin', 'en', 'mobile'),

-- Common
('common.goBack', 'Go Back', 'en', 'mobile'),
('common.cancel', 'Cancel', 'en', 'mobile'),
('common.delete', 'Delete', 'en', 'mobile'),
('common.ok', 'OK', 'en', 'mobile'),
('common.success', 'Success', 'en', 'mobile'),
('common.error', 'Error', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ==============================================
-- SWEDISH TRANSLATIONS
-- ==============================================

INSERT INTO translations (key, value, language, platform) VALUES
-- Route Detail General
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

-- Route Detail Actions
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

-- Route Detail Errors
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
('routeDetail.routeDeletedByAdmin', 'Rutt borttagen av admin', 'sv', 'mobile'),

-- Common
('common.goBack', 'Gå tillbaka', 'sv', 'mobile'),
('common.cancel', 'Avbryt', 'sv', 'mobile'),
('common.delete', 'Ta bort', 'sv', 'mobile'),
('common.ok', 'OK', 'sv', 'mobile'),
('common.success', 'Framgång', 'sv', 'mobile'),
('common.error', 'Fel', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
