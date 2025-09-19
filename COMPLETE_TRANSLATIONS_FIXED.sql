-- Complete Translations for ActionSheet and Avatar Modal
-- Following the format: id,key,language,value,platform,created_at,updated_at

-- ===========================================
-- ACTION SHEET TRANSLATIONS
-- ===========================================

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

-- ===========================================
-- AVATAR MODAL TRANSLATIONS
-- ===========================================

-- Profile Menu - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.menu',
  'en',
  'Profile Menu',
  'mobile',
  NOW(),
  NOW()
);

-- Profile Menu - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.menu',
  'sv',
  'Profilmeny',
  'mobile',
  NOW(),
  NOW()
);

-- View Profile Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfileDescription',
  'en',
  'View and edit your profile',
  'mobile',
  NOW(),
  NOW()
);

-- View Profile Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfileDescription',
  'sv',
  'Visa och redigera din profil',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudent',
  'en',
  'Switch Student View',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudent',
  'sv',
  'Växla Elevvy',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudentDescription',
  'en',
  'View progress as a student',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudentDescription',
  'sv',
  'Visa framsteg som elev',
  'mobile',
  NOW(),
  NOW()
);

-- Logout Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'auth.logoutDescription',
  'en',
  'Sign out of your account',
  'mobile',
  NOW(),
  NOW()
);

-- Logout Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'auth.logoutDescription',
  'sv',
  'Logga ut från ditt konto',
  'mobile',
  NOW(),
  NOW()
);
