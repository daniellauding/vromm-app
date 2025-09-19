-- Avatar Modal Translations (Only New Keys)
-- Following the format: id,key,language,value,platform,created_at,updated_at

-- Profile Menu - English (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.menu',
  'en',
  'Profile Menu',
  'mobile',
  NOW(),
  NOW()
);

-- Profile Menu - Swedish (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.menu',
  'sv',
  'Profilmeny',
  'mobile',
  NOW(),
  NOW()
);

-- View Profile Description - English (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfileDescription',
  'en',
  'View and edit your profile',
  'mobile',
  NOW(),
  NOW()
);

-- View Profile Description - Swedish (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.viewProfileDescription',
  'sv',
  'Visa och redigera din profil',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student - English (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudent',
  'en',
  'Switch Student View',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student - Swedish (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudent',
  'sv',
  'Växla Elevvy',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student Description - English (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudentDescription',
  'en',
  'View progress as a student',
  'mobile',
  NOW(),
  NOW()
);

-- Switch Student Description - Swedish (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.switchStudentDescription',
  'sv',
  'Visa framsteg som elev',
  'mobile',
  NOW(),
  NOW()
);

-- Logout Description - English (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'auth.logoutDescription',
  'en',
  'Sign out of your account',
  'mobile',
  NOW(),
  NOW()
);

-- Logout Description - Swedish (new key)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'auth.logoutDescription',
  'sv',
  'Logga ut från ditt konto',
  'mobile',
  NOW(),
  NOW()
);
