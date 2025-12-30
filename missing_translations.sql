-- Missing translations for ProgressScreen and ProgressSection
-- Add these to your Supabase content table
-- Run this in your Supabase SQL editor

INSERT INTO "public"."content" ("id", "key", "content_type", "platforms", "title", "body", "active", "created_at", "updated_at") VALUES 
-- ProgressScreen translations
(gen_random_uuid(), 'progressScreen.noLearningPaths', 'translation', ARRAY['mobile'], 
 '{"en": "No learning paths found", "sv": "Inga inlärningsvägar hittades"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'progressScreen.tryAdjustingFilters', 'translation', ARRAY['mobile'], 
 '{"en": "Try adjusting your filter settings to see more learning paths.", "sv": "Försök justera dina filterinställningar för att se fler inlärningsvägar."}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'progressScreen.activeFilters', 'translation', ARRAY['mobile'], 
 '{"en": "Active filters:", "sv": "Aktiva filter:"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'progressScreen.clearAllFilters', 'translation', ARRAY['mobile'], 
 '{"en": "Clear All Filters", "sv": "Rensa alla filter"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'progressScreen.suggestedFilters', 'translation', ARRAY['mobile'], 
 '{"en": "Try these filters:", "sv": "Prova dessa filter:"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

-- ProgressSection translations
(gen_random_uuid(), 'progressSection.noMatchingPaths', 'translation', ARRAY['mobile'], 
 '{"en": "No learning paths match your current filters", "sv": "Inga inlärningsvägar matchar dina nuvarande filter"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'progressSection.viewAllPaths', 'translation', ARRAY['mobile'], 
 '{"en": "View All Paths", "sv": "Visa alla vägar"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

-- Filter modal translations
(gen_random_uuid(), 'filters.reset', 'translation', ARRAY['mobile'], 
 '{"en": "Reset", "sv": "Återställ"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.filterLearningPaths', 'translation', ARRAY['mobile'], 
 '{"en": "Filter Learning Paths", "sv": "Filtrera inlärningsvägar"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.applyFilters', 'translation', ARRAY['mobile'], 
 '{"en": "Apply Filters", "sv": "Använd filter"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.vehicleType', 'translation', ARRAY['mobile'], 
 '{"en": "Vehicle Type", "sv": "Fordonstyp"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.transmissionType', 'translation', ARRAY['mobile'], 
 '{"en": "Transmission Type", "sv": "Växellåda"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.licenseType', 'translation', ARRAY['mobile'], 
 '{"en": "License Type", "sv": "Körkortstyp"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.experienceLevel', 'translation', ARRAY['mobile'], 
 '{"en": "Experience Level", "sv": "Erfarenhetsnivå"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.purpose', 'translation', ARRAY['mobile'], 
 '{"en": "Purpose", "sv": "Syfte"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.userProfile', 'translation', ARRAY['mobile'], 
 '{"en": "User Profile", "sv": "Användarprofil"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.platform', 'translation', ARRAY['mobile'], 
 '{"en": "Platform", "sv": "Plattform"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'filters.contentType', 'translation', ARRAY['mobile'], 
 '{"en": "Content Type", "sv": "Innehållstyp"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'common.all', 'translation', ARRAY['mobile'], 
 '{"en": "All", "sv": "Alla"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

-- Exercise translations
(gen_random_uuid(), 'exercises.noExercises', 'translation', ARRAY['mobile'], 
 '{"en": "No exercises available", "sv": "Inga övningar tillgängliga"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW()),

(gen_random_uuid(), 'common.cancel', 'translation', ARRAY['mobile'], 
 '{"en": "Cancel", "sv": "Avbryt"}', 
 '{"en": "", "sv": ""}', 
 true, NOW(), NOW());

-- Fix passenger_car translation in learning_path_categories table
UPDATE learning_path_categories 
SET label = '{"en": "Passenger Car", "sv": "Personbil"}'
WHERE value = 'passenger_car';