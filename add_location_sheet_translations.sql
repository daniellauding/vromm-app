-- Add missing translation keys for location sheet save button and messages
-- Run this in Supabase SQL Editor
-- NOTE: This table uses 'platform' NOT 'namespace'

-- Swedish translations
INSERT INTO public.translations (key, language, value, platform, created_at, updated_at)
VALUES 
  ('profile.location.saveLocation', 'sv', 'Spara plats', 'mobile', now(), now()),
  ('profile.location.selectLocation', 'sv', 'Välj din plats', 'mobile', now(), now()),
  ('profile.location.detectLocation', 'sv', 'Hitta min plats', 'mobile', now(), now()),
  ('profile.location.detectingLocation', 'sv', 'Letar plats', 'mobile', now(), now()),
  ('profile.location.locationDetected', 'sv', 'Plats upptäckt', 'mobile', now(), now()),
  ('profile.location.clickSaveToConfirm', 'sv', 'Klicka Spara för att bekräfta', 'mobile', now(), now()),
  ('profile.location.clearLocation', 'sv', 'Rensa plats', 'mobile', now(), now()),
  ('profile.location.locationCleared', 'sv', 'Plats rensad', 'mobile', now(), now()),
  ('profile.location.locationUpdated', 'sv', 'Plats uppdaterad', 'mobile', now(), now()),
  ('profile.location.locationUpdatedMessage', 'sv', 'Din plats har uppdaterats.', 'mobile', now(), now()),
  ('profile.location.failedToUpdate', 'sv', 'Misslyckades att uppdatera plats. Försök igen.', 'mobile', now(), now()),
  ('profile.location.invalidLocationData', 'sv', 'Ogiltig platsdata. Försök igen.', 'mobile', now(), now()),
  ('profile.location.searchPlaceholder', 'sv', 'Sök städer... (prova ''Stockholm'', ''Göteborg'', etc.)', 'mobile', now(), now()),
  ('profile.location.noLocationsFound', 'sv', 'Inga platser hittades. Fortsätt skriva för att söka globalt.', 'mobile', now(), now()),
  ('common.deletedUser', 'sv', 'Raderad användare', 'mobile', now(), now()),
  ('common.unknownUser', 'sv', 'Okänd användare', 'mobile', now(), now())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- English translations
INSERT INTO public.translations (key, language, value, platform, created_at, updated_at)
VALUES 
  ('profile.location.saveLocation', 'en', 'Save Location', 'mobile', now(), now()),
  ('profile.location.selectLocation', 'en', 'Select Your Location', 'mobile', now(), now()),
  ('profile.location.detectLocation', 'en', 'Detect My Location', 'mobile', now(), now()),
  ('profile.location.detectingLocation', 'en', 'Detecting Location', 'mobile', now(), now()),
  ('profile.location.locationDetected', 'en', 'Location detected', 'mobile', now(), now()),
  ('profile.location.clickSaveToConfirm', 'en', 'Click Save to confirm', 'mobile', now(), now()),
  ('profile.location.clearLocation', 'en', 'Clear Location', 'mobile', now(), now()),
  ('profile.location.locationCleared', 'en', 'Location cleared', 'mobile', now(), now()),
  ('profile.location.locationUpdated', 'en', 'Location Updated', 'mobile', now(), now()),
  ('profile.location.locationUpdatedMessage', 'en', 'Your location has been updated.', 'mobile', now(), now()),
  ('profile.location.failedToUpdate', 'en', 'Failed to update location. Please try again.', 'mobile', now(), now()),
  ('profile.location.invalidLocationData', 'en', 'Invalid location data. Please try again.', 'mobile', now(), now()),
  ('profile.location.searchPlaceholder', 'en', 'Search cities... (try ''Stockholm'', ''New York'', etc.)', 'mobile', now(), now()),
  ('profile.location.noLocationsFound', 'en', 'No locations found. Keep typing to search worldwide.', 'mobile', now(), now()),
  ('common.deletedUser', 'en', 'Deleted User', 'mobile', now(), now()),
  ('common.unknownUser', 'en', 'Unknown User', 'mobile', now(), now())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Additional error translations
INSERT INTO public.translations (key, language, value, platform, created_at, updated_at)
VALUES 
  ('errors.permissionDenied', 'sv', 'Tillstånd nekat', 'mobile', now(), now()),
  ('errors.enableLocationServices', 'sv', 'Aktivera platstjänster för att använda denna funktion', 'mobile', now(), now()),
  ('errors.locationDetectionFailed', 'sv', 'Misslyckades med att hitta plats', 'mobile', now(), now()),
  ('errors.permissionDenied', 'en', 'Permission denied', 'mobile', now(), now()),
  ('errors.enableLocationServices', 'en', 'Please enable location services to use this feature', 'mobile', now(), now()),
  ('errors.locationDetectionFailed', 'en', 'Failed to detect location', 'mobile', now(), now())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Common translations
INSERT INTO public.translations (key, language, value, platform, created_at, updated_at)
VALUES 
  ('common.success', 'sv', 'Framgång', 'mobile', now(), now()),
  ('common.error', 'sv', 'Fel', 'mobile', now(), now()),
  ('common.success', 'en', 'Success', 'mobile', now(), now()),
  ('common.error', 'en', 'Error', 'mobile', now(), now()),
  ('errors.title', 'sv', 'Fel', 'mobile', now(), now()),
  ('errors.title', 'en', 'Error', 'mobile', now(), now())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();
