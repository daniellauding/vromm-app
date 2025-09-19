-- Avatar Modal Translations
-- Following the format: id,key,language,value,platform,created_at,updated_at

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

-- View Profile - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfile',
  'en',
  'View Profile',
  'mobile',
  NOW(),
  NOW()
);

-- View Profile - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfile',
  'sv',
  'Visa Profil',
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
