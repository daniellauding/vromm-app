-- SQL translations for missing filter keys in FilterSheet.tsx
-- Copy and paste this into your Supabase SQL editor

-- English translations
INSERT INTO translations (key, language, platform, value) VALUES
-- Content filters
('filters.content', 'en', 'mobile', 'Content'),
('filters.hasExercises', 'en', 'mobile', 'Has Exercises'),
('filters.hasMedia', 'en', 'mobile', 'Has Media'),
('filters.verified', 'en', 'mobile', 'Verified'),

-- Route type filters
('filters.routeType', 'en', 'mobile', 'Route Type'),
('filters.routeType.recorded', 'en', 'mobile', 'Recorded'),
('filters.routeType.waypoint', 'en', 'mobile', 'Waypoint'),
('filters.routeType.pen', 'en', 'mobile', 'Drawn'),

-- Rating filters
('filters.minRating', 'en', 'mobile', 'Minimum Rating'),
('filters.allRatings', 'en', 'mobile', 'All Ratings'),

-- Sort filters
('filters.sortBy', 'en', 'mobile', 'Sort By'),
('filters.sort.best_match', 'en', 'mobile', 'Best Match'),
('filters.sort.most_popular', 'en', 'mobile', 'Most Popular'),
('filters.sort.closest', 'en', 'mobile', 'Closest'),
('filters.sort.newly_added', 'en', 'mobile', 'Newly Added'),
('filters.sort.newest', 'en', 'mobile', 'Newest'),
('filters.sort.my_created', 'en', 'mobile', 'My Created'),
('filters.sort.best_review', 'en', 'mobile', 'Best Review'),
('filters.sort.has_image', 'en', 'mobile', 'Has Image'),

-- Experience level (if different from difficulty)
('filters.experienceLevel', 'en', 'mobile', 'Experience Level'),
('filters.experienceLevel.beginner', 'en', 'mobile', 'Beginner'),
('filters.experienceLevel.intermediate', 'en', 'mobile', 'Intermediate'),
('filters.experienceLevel.advanced', 'en', 'mobile', 'Advanced'),
('filters.experienceLevel.expert', 'en', 'mobile', 'Expert'),

-- Distance filter
('filters.maxDistance', 'en', 'mobile', 'Max Distance'),

-- Other existing filters (for completeness)
('filters.difficulty', 'en', 'mobile', 'Difficulty'),
('filters.difficulty.beginner', 'en', 'mobile', 'Beginner'),
('filters.difficulty.intermediate', 'en', 'mobile', 'Intermediate'),
('filters.difficulty.advanced', 'en', 'mobile', 'Advanced'),

('filters.spotType', 'en', 'mobile', 'Spot Type'),
('filters.spotType.urban', 'en', 'mobile', 'Urban'),
('filters.spotType.highway', 'en', 'mobile', 'Highway'),
('filters.spotType.rural', 'en', 'mobile', 'Rural'),
('filters.spotType.parking', 'en', 'mobile', 'Parking'),

('filters.category', 'en', 'mobile', 'Category'),
('filters.category.parking', 'en', 'mobile', 'Parking'),
('filters.category.incline_start', 'en', 'mobile', 'Incline Start'),

('filters.transmissionType', 'en', 'mobile', 'Transmission'),
('filters.transmissionType.automatic', 'en', 'mobile', 'Automatic'),
('filters.transmissionType.manual', 'en', 'mobile', 'Manual'),
('filters.transmissionType.both', 'en', 'mobile', 'Both'),

('filters.activityLevel', 'en', 'mobile', 'Activity Level'),
('filters.activityLevel.moderate', 'en', 'mobile', 'Moderate'),
('filters.activityLevel.high', 'en', 'mobile', 'High'),

('filters.bestSeason', 'en', 'mobile', 'Best Season'),
('filters.bestSeason.all', 'en', 'mobile', 'All Seasons'),
('filters.bestSeason.year-round', 'en', 'mobile', 'Year Round'),
('filters.bestSeason.avoid-winter', 'en', 'mobile', 'Avoid Winter'),

('filters.vehicleTypes', 'en', 'mobile', 'Vehicle Types'),
('filters.vehicleTypes.passenger_car', 'en', 'mobile', 'Passenger Car'),
('filters.vehicleTypes.rv', 'en', 'mobile', 'RV'),

('filters.seeRoutes', 'en', 'mobile', 'See Routes'),

-- Swedish translations
('filters.content', 'sv', 'mobile', 'Innehåll'),
('filters.hasExercises', 'sv', 'mobile', 'Har Övningar'),
('filters.hasMedia', 'sv', 'mobile', 'Har Media'),
('filters.verified', 'sv', 'mobile', 'Verifierad'),

('filters.routeType', 'sv', 'mobile', 'Rutttyp'),
('filters.routeType.recorded', 'sv', 'mobile', 'Inspelad'),
('filters.routeType.waypoint', 'sv', 'mobile', 'Vägpunkter'),
('filters.routeType.pen', 'sv', 'mobile', 'Ritad'),

('filters.minRating', 'sv', 'mobile', 'Minsta Betyg'),
('filters.allRatings', 'sv', 'mobile', 'Alla Betyg'),

('filters.sortBy', 'sv', 'mobile', 'Sortera Efter'),
('filters.sort.best_match', 'sv', 'mobile', 'Bästa Matchning'),
('filters.sort.most_popular', 'sv', 'mobile', 'Mest Populära'),
('filters.sort.closest', 'sv', 'mobile', 'Närmast'),
('filters.sort.newly_added', 'sv', 'mobile', 'Nyligen Tillagda'),
('filters.sort.newest', 'sv', 'mobile', 'Nyaste'),
('filters.sort.my_created', 'sv', 'mobile', 'Mina Skapade'),
('filters.sort.best_review', 'sv', 'mobile', 'Bästa Recension'),
('filters.sort.has_image', 'sv', 'mobile', 'Har Bild'),

('filters.experienceLevel', 'sv', 'mobile', 'Erfarenhetsnivå'),
('filters.experienceLevel.beginner', 'sv', 'mobile', 'Nybörjare'),
('filters.experienceLevel.intermediate', 'sv', 'mobile', 'Mellannivå'),
('filters.experienceLevel.advanced', 'sv', 'mobile', 'Avancerad'),
('filters.experienceLevel.expert', 'sv', 'mobile', 'Expert'),

('filters.maxDistance', 'sv', 'mobile', 'Max Avstånd'),

('filters.difficulty', 'sv', 'mobile', 'Svårighetsgrad'),
('filters.difficulty.beginner', 'sv', 'mobile', 'Nybörjare'),
('filters.difficulty.intermediate', 'sv', 'mobile', 'Mellannivå'),
('filters.difficulty.advanced', 'sv', 'mobile', 'Avancerad'),

('filters.spotType', 'sv', 'mobile', 'Platstyp'),
('filters.spotType.urban', 'sv', 'mobile', 'Stadsmiljö'),
('filters.spotType.highway', 'sv', 'mobile', 'Motorväg'),
('filters.spotType.rural', 'sv', 'mobile', 'Landsbygd'),
('filters.spotType.parking', 'sv', 'mobile', 'Parkering'),

('filters.category', 'sv', 'mobile', 'Kategori'),
('filters.category.parking', 'sv', 'mobile', 'Parkering'),
('filters.category.incline_start', 'sv', 'mobile', 'Uppförsbacke'),

('filters.transmissionType', 'sv', 'mobile', 'Växellåda'),
('filters.transmissionType.automatic', 'sv', 'mobile', 'Automat'),
('filters.transmissionType.manual', 'sv', 'mobile', 'Manuell'),
('filters.transmissionType.both', 'sv', 'mobile', 'Båda'),

('filters.activityLevel', 'sv', 'mobile', 'Aktivitetsnivå'),
('filters.activityLevel.moderate', 'sv', 'mobile', 'Måttlig'),
('filters.activityLevel.high', 'sv', 'mobile', 'Hög'),

('filters.bestSeason', 'sv', 'mobile', 'Bästa Säsong'),
('filters.bestSeason.all', 'sv', 'mobile', 'Alla Årstider'),
('filters.bestSeason.year-round', 'sv', 'mobile', 'Året Om'),
('filters.bestSeason.avoid-winter', 'sv', 'mobile', 'Undvik Vinter'),

('filters.vehicleTypes', 'sv', 'mobile', 'Fordonsstyper'),
('filters.vehicleTypes.passenger_car', 'sv', 'mobile', 'Personbil'),
('filters.vehicleTypes.rv', 'sv', 'mobile', 'Husvagn'),

('filters.seeRoutes', 'sv', 'mobile', 'Se Rutter')

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
