-- ActionSheet Button Translations
-- Following the format: id,key,language,value,platform,created_at,updated_at

-- Record Driving Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'map.recordDrivingDescription',
  'en',
  'Record your driving session with GPS tracking',
  'mobile',
  NOW(),
  NOW()
);

-- Record Driving Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'map.recordDrivingDescription',
  'sv',
  'Spela in din körsession med GPS-spårning',
  'mobile',
  NOW(),
  NOW()
);

-- Create Route Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'createRoute.createDescription',
  'en',
  'Plan and create a new driving route',
  'mobile',
  NOW(),
  NOW()
);

-- Create Route Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'createRoute.createDescription',
  'sv',
  'Planera och skapa en ny körrutt',
  'mobile',
  NOW(),
  NOW()
);
