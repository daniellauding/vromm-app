-- Theme Settings Translations
-- Following the format: id,key,language,value,platform,created_at,updated_at

-- Theme System - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.system',
  'en',
  'System Default',
  'mobile',
  NOW(),
  NOW()
);

-- Theme System - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.system',
  'sv',
  'Systemstandard',
  'mobile',
  NOW(),
  NOW()
);

-- Theme System Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.systemDescription',
  'en',
  'Follow your device\'s theme setting',
  'mobile',
  NOW(),
  NOW()
);

-- Theme System Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.systemDescription',
  'sv',
  'Följ din enhets temainställning',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Light - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.light',
  'en',
  'Light Mode',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Light - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.light',
  'sv',
  'Ljust läge',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Light Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.lightDescription',
  'en',
  'Clean, bright interface for daytime use',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Light Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.lightDescription',
  'sv',
  'Ren, ljus gränssnitt för dagtid',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Dark - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.dark',
  'en',
  'Dark Mode',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Dark - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.dark',
  'sv',
  'Mörkt läge',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Dark Description - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.darkDescription',
  'en',
  'Easy on the eyes for low-light environments',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Dark Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.darkDescription',
  'sv',
  'Skonsamt för ögonen i svagt ljus',
  'mobile',
  NOW(),
  NOW()
);
