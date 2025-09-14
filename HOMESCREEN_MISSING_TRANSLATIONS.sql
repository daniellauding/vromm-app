-- =====================================================
-- HOMESCREEN MISSING TRANSLATIONS
-- =====================================================
-- This SQL adds all missing translations for HomeScreen components
-- including CityRoutes, CommunityFeed, Users section, and RouteCard
-- =====================================================

-- Add Swedish translations for HomeScreen components
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- City Routes Section
  ('home.cityRoutes.selectCity', 'sv', 'Välj en stad', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.noRoutesInCity', 'sv', 'Inga rutter i denna stad', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.noRoutesMessage', 'sv', 'Inga övningsrutter hittades i {city}. Var den första att skapa en eller utforska andra städer!', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.createRouteHere', 'sv', 'SKAPA RUTT HÄR', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.changeCity', 'sv', 'BYT STAD', 'mobile', NOW(), NOW()),
  
  -- Nearby Routes Section
  ('home.nearbyRoutes.noRoutes', 'sv', 'Inga närliggande rutter', 'mobile', NOW(), NOW()),
  ('home.nearbyRoutes.noRoutesMessage', 'sv', 'Inga övningsrutter hittades inom 100km från din plats. Skapa den första rutten i ditt område eller utforska kartan!', 'mobile', NOW(), NOW()),
  ('home.nearbyRoutes.createRouteHere', 'sv', 'Skapa rutt här', 'mobile', NOW(), NOW()),
  ('home.nearbyRoutes.exploreMap', 'sv', 'Utforska karta', 'mobile', NOW(), NOW()),
  
  -- Community Feed Section
  ('home.communityFeed.title', 'sv', 'Community Feed', 'mobile', NOW(), NOW()),
  ('home.communityFeed.createdRoute', 'sv', 'skapade en rutt', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutHoursAgo', 'sv', 'cirka {hours} timmar sedan', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutDaysAgo', 'sv', 'cirka {days} dagar sedan', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutWeeksAgo', 'sv', 'cirka {weeks} veckor sedan', 'mobile', NOW(), NOW()),
  
  -- Users Section
  ('home.users.title', 'sv', 'Användare', 'mobile', NOW(), NOW()),
  ('home.users.role.student', 'sv', 'ELEV', 'mobile', NOW(), NOW()),
  ('home.users.role.instructor', 'sv', 'INSTRUKTÖR', 'mobile', NOW(), NOW()),
  ('home.users.role.school', 'sv', 'KÖRSKOLA', 'mobile', NOW(), NOW()),
  ('home.users.location.notSpecified', 'sv', 'Inte angivet', 'mobile', NOW(), NOW()),
  
  -- RouteCard Component
  ('routeCard.reviews.single', 'sv', 'recension', 'mobile', NOW(), NOW()),
  ('routeCard.reviews.multiple', 'sv', 'recensioner', 'mobile', NOW(), NOW()),
  ('routeCard.video.tapToPlay', 'sv', 'Tryck för att spela video', 'mobile', NOW(), NOW()),
  ('routeCard.creator.unknown', 'sv', 'Okänd', 'mobile', NOW(), NOW()),
  
  -- Nearby Routes
  ('home.nearbyRoutes.noRoutesMessage', 'sv', 'Inga övningsrutter hittades inom 100km från din plats. Skapa den första rutten i ditt område eller utforska kartan!', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add English translations for HomeScreen components
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- City Routes Section
  ('home.cityRoutes.selectCity', 'en', 'Select a city', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.noRoutesInCity', 'en', 'No Routes in This City', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.noRoutesMessage', 'en', 'No practice routes found in {city}. Be the first to create one or explore other cities!', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.createRouteHere', 'en', 'CREATE ROUTE HERE', 'mobile', NOW(), NOW()),
  ('home.cityRoutes.changeCity', 'en', 'CHANGE CITY', 'mobile', NOW(), NOW()),
  
  -- Community Feed Section
  ('home.communityFeed.title', 'en', 'Community Feed', 'mobile', NOW(), NOW()),
  ('home.communityFeed.createdRoute', 'en', 'created a route', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutHoursAgo', 'en', 'about {hours} hours ago', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutDaysAgo', 'en', 'about {days} days ago', 'mobile', NOW(), NOW()),
  ('home.communityFeed.aboutWeeksAgo', 'en', 'about {weeks} weeks ago', 'mobile', NOW(), NOW()),
  
  -- Users Section
  ('home.users.title', 'en', 'Users', 'mobile', NOW(), NOW()),
  ('home.users.role.student', 'en', 'STUDENT', 'mobile', NOW(), NOW()),
  ('home.users.role.instructor', 'en', 'INSTRUCTOR', 'mobile', NOW(), NOW()),
  ('home.users.role.school', 'en', 'DRIVING SCHOOL', 'mobile', NOW(), NOW()),
  ('home.users.location.notSpecified', 'en', 'Not specified', 'mobile', NOW(), NOW()),
  
  -- RouteCard Component
  ('routeCard.reviews.single', 'en', 'review', 'mobile', NOW(), NOW()),
  ('routeCard.reviews.multiple', 'en', 'reviews', 'mobile', NOW(), NOW()),
  ('routeCard.video.tapToPlay', 'en', 'Tap to play video', 'mobile', NOW(), NOW()),
  ('routeCard.creator.unknown', 'en', 'Unknown', 'mobile', NOW(), NOW()),
  
  -- Nearby Routes
  ('home.nearbyRoutes.noRoutesMessage', 'en', 'No practice routes found within 100km of your location. Create the first route in your area or explore the map!', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the translations were added
SELECT key, language, value 
FROM translations 
WHERE key IN (
  'home.cityRoutes.selectCity',
  'home.cityRoutes.noRoutesInCity',
  'home.cityRoutes.noRoutesMessage',
  'home.cityRoutes.createRouteHere',
  'home.cityRoutes.changeCity',
  'home.communityFeed.title',
  'home.communityFeed.createdRoute',
  'home.communityFeed.aboutHoursAgo',
  'home.users.title',
  'home.users.role.student',
  'home.users.location.notSpecified',
  'routeCard.reviews.single',
  'routeCard.reviews.multiple',
  'routeCard.video.tapToPlay',
  'routeCard.creator.unknown',
  'home.nearbyRoutes.noRoutesMessage'
)
ORDER BY key, language;
