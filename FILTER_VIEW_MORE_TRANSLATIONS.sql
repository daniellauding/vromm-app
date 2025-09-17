-- FilterSheet View More/Show Less Translations
-- Swedish and English translations for collection view toggle

-- English translations
INSERT INTO translations (id, key, language, platform, value, created_at, updated_at) VALUES
-- View More/Show Less
('660f9511-f3ac-52e5-b827-557766551112', 'filters.viewMore', 'en', 'mobile', 'View More', NOW(), NOW()),
('660f9511-f3ac-52e5-b827-557766551113', 'filters.showLess', 'en', 'mobile', 'Show Less', NOW(), NOW()),
('660f9511-f3ac-52e5-b827-557766551114', 'filters.more', 'en', 'mobile', 'more', NOW(), NOW()),

-- Swedish translations
('660f9511-f3ac-52e5-b827-557766551115', 'filters.viewMore', 'sv', 'mobile', 'Visa fler', NOW(), NOW()),
('660f9511-f3ac-52e5-b827-557766551116', 'filters.showLess', 'sv', 'mobile', 'Visa färre', NOW(), NOW()),
('660f9511-f3ac-52e5-b827-557766551117', 'filters.more', 'sv', 'mobile', 'fler', NOW(), NOW())

-- Handle conflicts by updating existing records
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
