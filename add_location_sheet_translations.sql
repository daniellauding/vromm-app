-- Add missing translation keys for location sheet save button and messages
-- Run this in Supabase SQL Editor

-- Swedish translations
INSERT INTO translations (key, language, value, namespace, created_at, updated_at)
VALUES 
  ('profile.location.saveLocation', 'sv', 'Spara plats', 'app', now(), now()),
  ('profile.location.selectLocation', 'sv', 'Välj din plats', 'app', now(), now()),
  ('profile.location.detectLocation', 'sv', 'Hitta min plats', 'app', now(), now()),
  ('profile.location.detectingLocation', 'sv', 'Letar plats', 'app', now(), now()),
  ('profile.location.locationDetected', 'sv', 'Plats upptäckt', 'app', now(), now()),
  ('profile.location.clickSaveToConfirm', 'sv', 'Klicka Spara för att bekräfta', 'app', now(), now()),
  ('profile.location.clearLocation', 'sv', 'Rensa plats', 'app', now(), now()),
  ('profile.location.locationCleared', 'sv', 'Plats rensad', 'app', now(), now()),
  ('profile.location.searchPlaceholder', 'sv', 'Sök städer... (prova ''Stockholm'', ''Göteborg'', etc.)', 'app', now(), now()),
  ('profile.location.noLocationsFound', 'sv', 'Inga platser hittades. Fortsätt skriva för att söka globalt.', 'app', now(), now())
ON CONFLICT (key, language, namespace) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- English translations
INSERT INTO translations (key, language, value, namespace, created_at, updated_at)
VALUES 
  ('profile.location.saveLocation', 'en', 'Save Location', 'app', now(), now()),
  ('profile.location.selectLocation', 'en', 'Select Your Location', 'app', now(), now()),
  ('profile.location.detectLocation', 'en', 'Detect My Location', 'app', now(), now()),
  ('profile.location.detectingLocation', 'en', 'Detecting Location', 'app', now(), now()),
  ('profile.location.locationDetected', 'en', 'Location detected', 'app', now(), now()),
  ('profile.location.clickSaveToConfirm', 'en', 'Click Save to confirm', 'app', now(), now()),
  ('profile.location.clearLocation', 'en', 'Clear Location', 'app', now(), now()),
  ('profile.location.locationCleared', 'en', 'Location cleared', 'app', now(), now()),
  ('profile.location.searchPlaceholder', 'en', 'Search cities... (try ''Stockholm'', ''New York'', etc.)', 'app', now(), now()),
  ('profile.location.noLocationsFound', 'en', 'No locations found. Keep typing to search worldwide.', 'app', now(), now())
ON CONFLICT (key, language, namespace) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Additional error translations
INSERT INTO translations (key, language, value, namespace, created_at, updated_at)
VALUES 
  ('errors.permissionDenied', 'sv', 'Tillstånd nekat', 'app', now(), now()),
  ('errors.enableLocationServices', 'sv', 'Aktivera platstjänster för att använda denna funktion', 'app', now(), now()),
  ('errors.locationDetectionFailed', 'sv', 'Misslyckades med att hitta plats', 'app', now(), now()),
  ('errors.permissionDenied', 'en', 'Permission denied', 'app', now(), now()),
  ('errors.enableLocationServices', 'en', 'Please enable location services to use this feature', 'app', now(), now()),
  ('errors.locationDetectionFailed', 'en', 'Failed to detect location', 'app', now(), now())
ON CONFLICT (key, language, namespace) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Common translations
INSERT INTO translations (key, language, value, namespace, created_at, updated_at)
VALUES 
  ('common.success', 'sv', 'Framgång', 'app', now(), now()),
  ('common.error', 'sv', 'Fel', 'app', now(), now()),
  ('common.success', 'en', 'Success', 'app', now(), now()),
  ('common.error', 'en', 'Error', 'app', now(), now()),
  ('errors.title', 'sv', 'Fel', 'app', now(), now()),
  ('errors.title', 'en', 'Error', 'app', now(), now())
ON CONFLICT (key, language, namespace) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

