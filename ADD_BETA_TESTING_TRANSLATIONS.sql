-- Add beta testing tab translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
-- Swedish translations
('007b53a0-3662-4580-a0cd-50a4b3a16311', 'navigation.betaTesting', 'sv', 'Uppgifter', 'mobile', NOW(), NOW()),

-- English translations  
('007b53a0-3662-4580-a0cd-50a4b3a16312', 'navigation.betaTesting', 'en', 'Tasks', 'mobile', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
