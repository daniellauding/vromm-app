-- ============================================================================
-- COMPREHENSIVE FILTER TRANSLATIONS FOR VROMM APP
-- Run this in Supabase SQL Editor to add all filter translations
-- ============================================================================

-- Clean up any existing filter translations to avoid conflicts
DELETE FROM translations WHERE key LIKE 'filters.%';

-- Insert all filter translations with ON CONFLICT handling
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES
  -- Sort Options
  ('filters.sortBy', 'en', 'Sort By', 'mobile', NOW(), NOW()),
  ('filters.sortBy', 'sv', 'Sortera Efter', 'mobile', NOW(), NOW()),
  ('filters.sort.best_match', 'en', 'Best Match', 'mobile', NOW(), NOW()),
  ('filters.sort.best_match', 'sv', 'Bästa Matchning', 'mobile', NOW(), NOW()),
  ('filters.sort.most_popular', 'en', 'Most Popular', 'mobile', NOW(), NOW()),
  ('filters.sort.most_popular', 'sv', 'Mest Populära', 'mobile', NOW(), NOW()),
  ('filters.sort.closest', 'en', 'Closest', 'mobile', NOW(), NOW()),
  ('filters.sort.closest', 'sv', 'Närmast', 'mobile', NOW(), NOW()),
  ('filters.sort.newly_added', 'en', 'Newly Added', 'mobile', NOW(), NOW()),
  ('filters.sort.newly_added', 'sv', 'Nyligen Tillagda', 'mobile', NOW(), NOW()),
  ('filters.sort.newest', 'en', 'Newest', 'mobile', NOW(), NOW()),
  ('filters.sort.newest', 'sv', 'Nyaste', 'mobile', NOW(), NOW()),
  ('filters.sort.my_created', 'en', 'My Created', 'mobile', NOW(), NOW()),
  ('filters.sort.my_created', 'sv', 'Mina Skapade', 'mobile', NOW(), NOW()),
  ('filters.sort.best_review', 'en', 'Best Review', 'mobile', NOW(), NOW()),
  ('filters.sort.best_review', 'sv', 'Bästa Recension', 'mobile', NOW(), NOW()),
  ('filters.sort.has_image', 'en', 'Has Image', 'mobile', NOW(), NOW()),
  ('filters.sort.has_image', 'sv', 'Har Bild', 'mobile', NOW(), NOW()),

  -- Difficulty
  ('filters.difficulty', 'en', 'Difficulty', 'mobile', NOW(), NOW()),
  ('filters.difficulty', 'sv', 'Svårighetsgrad', 'mobile', NOW(), NOW()),
  ('filters.difficulty.beginner', 'en', 'Beginner', 'mobile', NOW(), NOW()),
  ('filters.difficulty.beginner', 'sv', 'Nybörjare', 'mobile', NOW(), NOW()),
  ('filters.difficulty.intermediate', 'en', 'Intermediate', 'mobile', NOW(), NOW()),
  ('filters.difficulty.intermediate', 'sv', 'Medel', 'mobile', NOW(), NOW()),
  ('filters.difficulty.advanced', 'en', 'Advanced', 'mobile', NOW(), NOW()),
  ('filters.difficulty.advanced', 'sv', 'Avancerad', 'mobile', NOW(), NOW()),

  -- Spot Type
  ('filters.spotType', 'en', 'Spot Type', 'mobile', NOW(), NOW()),
  ('filters.spotType', 'sv', 'Platstyp', 'mobile', NOW(), NOW()),
  ('filters.spotType.urban', 'en', 'Urban', 'mobile', NOW(), NOW()),
  ('filters.spotType.urban', 'sv', 'Urban', 'mobile', NOW(), NOW()),
  ('filters.spotType.highway', 'en', 'Highway', 'mobile', NOW(), NOW()),
  ('filters.spotType.highway', 'sv', 'Motorväg', 'mobile', NOW(), NOW()),
  ('filters.spotType.rural', 'en', 'Rural', 'mobile', NOW(), NOW()),
  ('filters.spotType.rural', 'sv', 'Landsbygd', 'mobile', NOW(), NOW()),
  ('filters.spotType.parking', 'en', 'Parking', 'mobile', NOW(), NOW()),
  ('filters.spotType.parking', 'sv', 'Parkering', 'mobile', NOW(), NOW()),

  -- Category
  ('filters.category', 'en', 'Category', 'mobile', NOW(), NOW()),
  ('filters.category', 'sv', 'Kategori', 'mobile', NOW(), NOW()),
  ('filters.category.parking', 'en', 'Parking', 'mobile', NOW(), NOW()),
  ('filters.category.parking', 'sv', 'Parkering', 'mobile', NOW(), NOW()),
  ('filters.category.incline_start', 'en', 'Incline Start', 'mobile', NOW(), NOW()),
  ('filters.category.incline_start', 'sv', 'Backstart', 'mobile', NOW(), NOW()),

  -- Transmission Type
  ('filters.transmissionType', 'en', 'Transmission', 'mobile', NOW(), NOW()),
  ('filters.transmissionType', 'sv', 'Växellåda', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.automatic', 'en', 'Automatic', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.automatic', 'sv', 'Automat', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.manual', 'en', 'Manual', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.manual', 'sv', 'Manuell', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.both', 'en', 'Both', 'mobile', NOW(), NOW()),
  ('filters.transmissionType.both', 'sv', 'Båda', 'mobile', NOW(), NOW()),

  -- Activity Level
  ('filters.activityLevel', 'en', 'Activity Level', 'mobile', NOW(), NOW()),
  ('filters.activityLevel', 'sv', 'Aktivitetsnivå', 'mobile', NOW(), NOW()),
  ('filters.activityLevel.moderate', 'en', 'Moderate', 'mobile', NOW(), NOW()),
  ('filters.activityLevel.moderate', 'sv', 'Måttlig', 'mobile', NOW(), NOW()),
  ('filters.activityLevel.high', 'en', 'High', 'mobile', NOW(), NOW()),
  ('filters.activityLevel.high', 'sv', 'Hög', 'mobile', NOW(), NOW()),

  -- Best Season
  ('filters.bestSeason', 'en', 'Best Season', 'mobile', NOW(), NOW()),
  ('filters.bestSeason', 'sv', 'Bästa Säsong', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.all', 'en', 'All', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.all', 'sv', 'Alla', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.year-round', 'en', 'Year-round', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.year-round', 'sv', 'Året runt', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.avoid-winter', 'en', 'Avoid Winter', 'mobile', NOW(), NOW()),
  ('filters.bestSeason.avoid-winter', 'sv', 'Undvik vinter', 'mobile', NOW(), NOW()),

  -- Vehicle Types
  ('filters.vehicleTypes', 'en', 'Vehicle Types', 'mobile', NOW(), NOW()),
  ('filters.vehicleTypes', 'sv', 'Fordonstyper', 'mobile', NOW(), NOW()),
  ('filters.vehicleTypes.passenger_car', 'en', 'Passenger Car', 'mobile', NOW(), NOW()),
  ('filters.vehicleTypes.passenger_car', 'sv', 'Personbil', 'mobile', NOW(), NOW()),
  ('filters.vehicleTypes.rv', 'en', 'RV', 'mobile', NOW(), NOW()),
  ('filters.vehicleTypes.rv', 'sv', 'Husbil', 'mobile', NOW(), NOW()),

  -- Content Filters
  ('filters.content', 'en', 'Content', 'mobile', NOW(), NOW()),
  ('filters.content', 'sv', 'Innehåll', 'mobile', NOW(), NOW()),
  ('filters.hasExercises', 'en', 'Has Exercises', 'mobile', NOW(), NOW()),
  ('filters.hasExercises', 'sv', 'Har Övningar', 'mobile', NOW(), NOW()),
  ('filters.hasMedia', 'en', 'Has Media', 'mobile', NOW(), NOW()),
  ('filters.hasMedia', 'sv', 'Har Media', 'mobile', NOW(), NOW()),
  ('filters.verified', 'en', 'Verified', 'mobile', NOW(), NOW()),
  ('filters.verified', 'sv', 'Verifierad', 'mobile', NOW(), NOW()),

  -- Route Type
  ('filters.routeType', 'en', 'Route Type', 'mobile', NOW(), NOW()),
  ('filters.routeType', 'sv', 'Rutttyp', 'mobile', NOW(), NOW()),
  ('filters.routeType.recorded', 'en', 'Recorded', 'mobile', NOW(), NOW()),
  ('filters.routeType.recorded', 'sv', 'Inspelad', 'mobile', NOW(), NOW()),
  ('filters.routeType.waypoint', 'en', 'Waypoint', 'mobile', NOW(), NOW()),
  ('filters.routeType.waypoint', 'sv', 'Vägpunkt', 'mobile', NOW(), NOW()),
  ('filters.routeType.pen', 'en', 'Pen', 'mobile', NOW(), NOW()),
  ('filters.routeType.pen', 'sv', 'Penna', 'mobile', NOW(), NOW()),

  -- Other
  ('filters.seeRoutes', 'en', 'See Routes', 'mobile', NOW(), NOW()),
  ('filters.seeRoutes', 'sv', 'Visa Rutter', 'mobile', NOW(), NOW()),
  ('filters.reset', 'en', 'Reset', 'mobile', NOW(), NOW()),
  ('filters.reset', 'sv', 'Återställ', 'mobile', NOW(), NOW()),
  ('filters.minRating', 'en', 'Minimum Rating', 'mobile', NOW(), NOW()),
  ('filters.minRating', 'sv', 'Minsta Betyg', 'mobile', NOW(), NOW()),
  ('filters.allRatings', 'en', 'All', 'mobile', NOW(), NOW()),
  ('filters.allRatings', 'sv', 'Alla', 'mobile', NOW(), NOW())

ON CONFLICT (key, language) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify
SELECT 'SUCCESS - Filter translations inserted/updated' as status;
SELECT key, language, value 
FROM translations 
WHERE key LIKE 'filters.%' 
ORDER BY key, language;

