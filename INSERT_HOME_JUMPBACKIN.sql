-- Insert home.jumpBackIn translation if missing
-- Run VERIFY_HOME_JUMPBACKIN.sql first to check if these already exist

-- English version
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'home.jumpBackIn',
  'en',
  'Jump back in',
  'mobile',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Swedish version
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'home.jumpBackIn',
  'sv',
  'Fortsätt där du slutade',
  'mobile',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

