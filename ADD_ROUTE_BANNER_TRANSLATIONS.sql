-- Add translations for the route creation banner
INSERT INTO public.translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'banner.createRoute.title', 'en', 'Upload your own route', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.title', 'sv', 'Ladda upp din egna rutt', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.description', 'en', 'Create and share your favorite driving routes', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.description', 'sv', 'Skapa och dela dina favoritrutter', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.button', 'en', 'Create Route', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.button', 'sv', 'Skapa Rutt', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.dismiss', 'en', 'Dismiss', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'banner.createRoute.dismiss', 'sv', 'Stäng', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
