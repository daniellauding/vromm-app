-- Daily Status Translation Strings
-- Format: INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
-- IMPORTANT: Use NOW() for timestamps to ensure cache invalidation works properly!

-- Media related strings
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111111', 'dailyStatus.addMemory', 'en', 'Add Memory', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111112', 'dailyStatus.addMemory', 'sv', 'Lägg till minne', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111113', 'dailyStatus.chooseMediaSource', 'en', 'Choose how to add your photo or video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111114', 'dailyStatus.chooseMediaSource', 'sv', 'Välj hur du vill lägga till foto eller video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111115', 'dailyStatus.chooseFromLibrary', 'en', 'Choose from Library', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111116', 'dailyStatus.chooseFromLibrary', 'sv', 'Välj från bibliotek', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111117', 'dailyStatus.takePhoto', 'en', 'Take Photo', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111118', 'dailyStatus.takePhoto', 'sv', 'Ta foto', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111119', 'dailyStatus.recordVideo', 'en', 'Record Video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111120', 'dailyStatus.recordVideo', 'sv', 'Spela in video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111121', 'dailyStatus.video', 'en', 'Video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111122', 'dailyStatus.video', 'sv', 'Video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111123', 'dailyStatus.photo', 'en', 'Photo', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111124', 'dailyStatus.photo', 'sv', 'Foto', 'mobile', NOW(), NOW());

-- Permission strings (common.permissionRequired already exists, skipping)
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111127', 'dailyStatus.libraryPermissionRequired', 'en', 'Library permission is required to choose media', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111128', 'dailyStatus.libraryPermissionRequired', 'sv', 'Bibliotheksbehörighet krävs för att välja media', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111129', 'dailyStatus.cameraPermissionRequiredPhoto', 'en', 'Camera permission is required to take photos', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111130', 'dailyStatus.cameraPermissionRequiredPhoto', 'sv', 'Kamerabehörighet krävs för att ta foton', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111131', 'dailyStatus.cameraPermissionRequiredVideo', 'en', 'Camera permission is required to record videos', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111132', 'dailyStatus.cameraPermissionRequiredVideo', 'sv', 'Kamerabehörighet krävs för att spela in videor', 'mobile', NOW(), NOW());

-- Success messages for media
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111133', 'dailyStatus.mediaAdded', 'en', 'Media Added', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111134', 'dailyStatus.mediaAdded', 'sv', 'Media tillagd', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111135', 'dailyStatus.mediaAddedMessage', 'en', '{mediaType} added to your daily memory', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111136', 'dailyStatus.mediaAddedMessage', 'sv', '{mediaType} har lagts till i ditt dagliga minne', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111137', 'dailyStatus.photoAdded', 'en', 'Photo Added', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111138', 'dailyStatus.photoAdded', 'sv', 'Foto tillagt', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111139', 'dailyStatus.photoAddedMessage', 'en', 'Photo added to your daily memory', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111140', 'dailyStatus.photoAddedMessage', 'sv', 'Foto har lagts till i ditt dagliga minne', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111141', 'dailyStatus.videoAdded', 'en', 'Video Added', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111142', 'dailyStatus.videoAdded', 'sv', 'Video tillagd', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111143', 'dailyStatus.videoAddedMessage', 'en', 'Video added to your daily memory', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111144', 'dailyStatus.videoAddedMessage', 'sv', 'Video har lagts till i ditt dagliga minne', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111145', 'dailyStatus.mediaRemoved', 'en', 'Media Removed', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111146', 'dailyStatus.mediaRemoved', 'sv', 'Media borttagen', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111147', 'dailyStatus.mediaRemovedMessage', 'en', 'Media removed from your daily memory', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111148', 'dailyStatus.mediaRemovedMessage', 'sv', 'Media har tagits bort från ditt dagliga minne', 'mobile', NOW(), NOW());

-- Error messages for media (common.error already exists, skipping)
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111151', 'dailyStatus.failedToAccessLibrary', 'en', 'Failed to access library', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111152', 'dailyStatus.failedToAccessLibrary', 'sv', 'Misslyckades med att komma åt biblioteket', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111153', 'dailyStatus.cameraError', 'en', 'Camera Error', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111154', 'dailyStatus.cameraError', 'sv', 'Kamerafel', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111155', 'dailyStatus.cameraNotAvailable', 'en', 'Camera is not available on this device', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111156', 'dailyStatus.cameraNotAvailable', 'sv', 'Kameran är inte tillgänglig på den här enheten', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111157', 'dailyStatus.failedToTakePhoto', 'en', 'Failed to take photo', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111158', 'dailyStatus.failedToTakePhoto', 'sv', 'Misslyckades med att ta foto', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111159', 'dailyStatus.failedToRecordVideo', 'en', 'Failed to record video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111160', 'dailyStatus.failedToRecordVideo', 'sv', 'Misslyckades med att spela in video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111161', 'dailyStatus.failedToShowMediaOptions', 'en', 'Failed to show media options', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111162', 'dailyStatus.failedToShowMediaOptions', 'sv', 'Misslyckades med att visa mediaalternativ', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111163', 'dailyStatus.uploadFailed', 'en', 'Upload Failed', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111164', 'dailyStatus.uploadFailed', 'sv', 'Uppladdning misslyckades', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111165', 'dailyStatus.failedToUploadMedia', 'en', 'Failed to upload media. Please try again.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111166', 'dailyStatus.failedToUploadMedia', 'sv', 'Misslyckades med att ladda upp media. Försök igen.', 'mobile', NOW(), NOW());

-- Common action strings (common.cancel, common.delete, common.success already exist, skipping)

-- Reset status strings
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111173', 'dailyStatus.resetStatus', 'en', 'Reset Status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111174', 'dailyStatus.resetStatus', 'sv', 'Återställ status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111175', 'dailyStatus.cannotReset', 'en', 'Cannot Reset', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111176', 'dailyStatus.cannotReset', 'sv', 'Kan inte återställa', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111177', 'dailyStatus.nothingToResetFuture', 'en', 'Nothing to reset for future dates!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111178', 'dailyStatus.nothingToResetFuture', 'sv', 'Inget att återställa för framtida datum!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111179', 'dailyStatus.formCleared', 'en', 'Form Cleared', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111180', 'dailyStatus.formCleared', 'sv', 'Formulär rensat', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111181', 'dailyStatus.formHasBeenReset', 'en', 'Form has been reset', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111182', 'dailyStatus.formHasBeenReset', 'sv', 'Formuläret har återställts', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111183', 'dailyStatus.confirmDeleteStatus', 'en', 'Are you sure you want to delete this status? This cannot be undone.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111184', 'dailyStatus.confirmDeleteStatus', 'sv', 'Är du säker på att du vill radera den här statusen? Detta kan inte ångras.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111185', 'dailyStatus.statusDeleted', 'en', 'Status Deleted', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111186', 'dailyStatus.statusDeleted', 'sv', 'Status raderad', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111187', 'dailyStatus.yourStatusHasBeenReset', 'en', 'Your status has been reset', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111188', 'dailyStatus.yourStatusHasBeenReset', 'sv', 'Din status har återställts', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111189', 'dailyStatus.failedToDeleteStatus', 'en', 'Failed to delete status. Please try again.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111190', 'dailyStatus.failedToDeleteStatus', 'sv', 'Misslyckades med att radera status. Försök igen.', 'mobile', NOW(), NOW());

-- Save status strings
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111191', 'dailyStatus.saveStatus', 'en', 'Save Status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111192', 'dailyStatus.saveStatus', 'sv', 'Spara status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111193', 'dailyStatus.saving', 'en', 'Saving...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111194', 'dailyStatus.saving', 'sv', 'Sparar...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111195', 'dailyStatus.cannotSave', 'en', 'Cannot Save', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111196', 'dailyStatus.cannotSave', 'sv', 'Kan inte spara', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111197', 'dailyStatus.comeBackOnThisDay', 'en', 'Come back on this day to share your status!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111198', 'dailyStatus.comeBackOnThisDay', 'sv', 'Kom tillbaka på den här dagen för att dela din status!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111199', 'dailyStatus.statusRequired', 'en', 'Status Required', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111200', 'dailyStatus.statusRequired', 'sv', 'Status krävs', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111201', 'dailyStatus.pleaseSelectStatus', 'en', 'Please select whether you drove or not', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111202', 'dailyStatus.pleaseSelectStatus', 'sv', 'Välj om du körde eller inte', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111203', 'dailyStatus.pleaseSelectStatusBeforeSaving', 'en', 'Please select whether you drove or not before saving', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111204', 'dailyStatus.pleaseSelectStatusBeforeSaving', 'sv', 'Välj om du körde eller inte innan du sparar', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111205', 'dailyStatus.failedToSaveStatus', 'en', 'Failed to save your status. Please try again.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111206', 'dailyStatus.failedToSaveStatus', 'sv', 'Misslyckades med att spara din status. Försök igen.', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111207', 'dailyStatus.dailyStatusSaved', 'en', 'Your daily status has been saved!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111208', 'dailyStatus.dailyStatusSaved', 'sv', 'Din dagliga status har sparats!', 'mobile', NOW(), NOW());

-- Display text strings
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111209', 'dailyStatus.didYouDriveToday', 'en', 'Did you drive today?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111210', 'dailyStatus.didYouDriveToday', 'sv', 'Har du kört idag?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111211', 'dailyStatus.futureDate', 'en', 'Future date', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111212', 'dailyStatus.futureDate', 'sv', 'Framtida datum', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111213', 'dailyStatus.didYouDriveOnDate', 'en', 'Did you drive on {date}?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111214', 'dailyStatus.didYouDriveOnDate', 'sv', 'Har du kört {date}?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111215', 'dailyStatus.today', 'en', 'today', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111216', 'dailyStatus.today', 'sv', 'idag', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111217', 'dailyStatus.yesDroveOnDate', 'en', 'Yes, I drove on {date}!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111218', 'dailyStatus.yesDroveOnDate', 'sv', 'Ja, jag körde {date}!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111219', 'dailyStatus.noDidntDriveOnDate', 'en', 'No, I didn''t drive on {date}', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111220', 'dailyStatus.noDidntDriveOnDate', 'sv', 'Nej, jag körde inte {date}', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111221', 'dailyStatus.placeholder', 'en', 'Did you drive today? Share your thoughts!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111222', 'dailyStatus.placeholder', 'sv', 'Har du kört idag? Dela dina tankar!', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111223', 'dailyStatus.futureDateCannotSave', 'en', 'Future date - cannot save', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111224', 'dailyStatus.futureDateCannotSave', 'sv', 'Framtida datum - kan inte spara', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111225', 'dailyStatus.editPreviousStatus', 'en', 'Edit previous status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111226', 'dailyStatus.editPreviousStatus', 'sv', 'Redigera tidigare status', 'mobile', NOW(), NOW());

-- Form field labels and placeholders
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111227', 'dailyStatus.status', 'en', 'Status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111228', 'dailyStatus.status', 'sv', 'Status', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111229', 'dailyStatus.yesIDrove', 'en', 'Yes, I drove', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111230', 'dailyStatus.yesIDrove', 'sv', 'Ja, jag körde', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111231', 'dailyStatus.noDidntDrive', 'en', 'No, I didn''t drive', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111232', 'dailyStatus.noDidntDrive', 'sv', 'Nej, körde inte', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111233', 'dailyStatus.howItWent', 'en', 'How did it go?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111234', 'dailyStatus.howItWent', 'sv', 'Hur gick det?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111235', 'dailyStatus.howItWentPlaceholder', 'en', 'Tell us how it went...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111236', 'dailyStatus.howItWentPlaceholder', 'sv', 'Berätta hur det gick...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111237', 'dailyStatus.challenges', 'en', 'Challenges?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111238', 'dailyStatus.challenges', 'sv', 'Utmaningar?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111239', 'dailyStatus.challengesPlaceholder', 'en', 'What was challenging?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111240', 'dailyStatus.challengesPlaceholder', 'sv', 'Vad var utmanande?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111241', 'dailyStatus.notes', 'en', 'Notes', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111242', 'dailyStatus.notes', 'sv', 'Anteckningar', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111243', 'dailyStatus.notesPlaceholder', 'en', 'Additional notes...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111244', 'dailyStatus.notesPlaceholder', 'sv', 'Ytterligare anteckningar...', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111245', 'dailyStatus.timeMinutes', 'en', 'Time (minutes)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111246', 'dailyStatus.timeMinutes', 'sv', 'Tid (minuter)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111247', 'dailyStatus.distanceKm', 'en', 'Distance (km)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111248', 'dailyStatus.distanceKm', 'sv', 'Distans (km)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111249', 'dailyStatus.ratingStars', 'en', 'Rating (1-5 stars)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111250', 'dailyStatus.ratingStars', 'sv', 'Betyg (1-5 stjärnor)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111251', 'dailyStatus.memoryPhotoVideo', 'en', 'Memory (Photo/Video)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111252', 'dailyStatus.memoryPhotoVideo', 'sv', 'Minne (Foto/Video)', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111253', 'dailyStatus.addPhotoOrVideo', 'en', 'Add Photo or Video', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111254', 'dailyStatus.addPhotoOrVideo', 'sv', 'Lägg till foto eller video', 'mobile', NOW(), NOW());

-- Exercises and routes strings
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES
('d1e1a1b1-1111-4111-a111-111111111255', 'dailyStatus.selectedExercises', 'en', 'Selected Exercises ({count})', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111256', 'dailyStatus.selectedExercises', 'sv', 'Valda övningar ({count})', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111257', 'dailyStatus.didYouDoExercisesToday', 'en', 'Did you do any exercises today?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111258', 'dailyStatus.didYouDoExercisesToday', 'sv', 'Gjorde du några övningar idag?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111259', 'dailyStatus.didYouDoExercisesOnDate', 'en', 'Did you do any exercises on {date}?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111260', 'dailyStatus.didYouDoExercisesOnDate', 'sv', 'Gjorde du några övningar {date}?', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111261', 'dailyStatus.findRoutes', 'en', 'Find Routes', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111262', 'dailyStatus.findRoutes', 'sv', 'Hitta rutter', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111263', 'dailyStatus.myRoutes', 'en', 'My Routes', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111264', 'dailyStatus.myRoutes', 'sv', 'Mina rutter', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111265', 'dailyStatus.createOrRecordRoute', 'en', 'Create or Record Route', 'mobile', NOW(), NOW()),
('d1e1a1b1-1111-4111-a111-111111111266', 'dailyStatus.createOrRecordRoute', 'sv', 'Skapa eller spela in rutt', 'mobile', NOW(), NOW());

