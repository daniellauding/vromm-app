-- Theme Settings Translations - English and Swedish
-- Following the format: id,key,language,value,platform,created_at,updated_at

-- Theme Settings Title - English
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.themeSettings',
  'en',
  'Theme Settings',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Settings Title - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.themeSettings',
  'sv',
  'Temainställningar',
  'mobile',
  NOW(),
  NOW()
);

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
  'Follow your device''s theme setting',
  'mobile',
  NOW(),
  NOW()
);

-- Theme System Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.systemDescription',
  'sv',
  'Följ enhetens tema',
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
  'Rent, ljust gränssnitt för dagtid',
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
  'Sleek, low-light interface for nighttime use',
  'mobile',
  NOW(),
  NOW()
);

-- Theme Dark Description - Swedish
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES (
  gen_random_uuid(),
  'profile.theme.darkDescription',
  'sv',
  'Elegant gränssnitt för svagt ljus på natten',
  'mobile',
  NOW(),
  NOW()
);
