-- =====================================================
-- PROGRESS SECTION MISSING TRANSLATIONS
-- =====================================================
-- This SQL adds all missing translations for ProgressSection.tsx
-- =====================================================

-- Add Swedish translations for ProgressSection
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- Progress Section Status Messages
  ('progressSection.viewingAs', 'sv', 'Visar som:', 'mobile', NOW(), NOW()),
  ('progressSection.lastAction', 'sv', 'Senast:', 'mobile', NOW(), NOW()),
  ('progressSection.unknown', 'sv', 'Okänd', 'mobile', NOW(), NOW()),
  ('progressSection.locked', 'sv', 'LÅST', 'mobile', NOW(), NOW()),
  ('progressSection.markedComplete', 'sv', 'Markerad som klar', 'mobile', NOW(), NOW()),
  ('progressSection.markedIncomplete', 'sv', 'Markerad som ofullständig', 'mobile', NOW(), NOW()),
  ('progressSection.repetition', 'sv', 'Repetition', 'mobile', NOW(), NOW()),
  ('progressSection.completed', 'sv', 'slutförd', 'mobile', NOW(), NOW()),
  ('progressSection.by', 'sv', 'av', 'mobile', NOW(), NOW()),
  ('progressSection.at', 'sv', 'kl', 'mobile', NOW(), NOW()),
  
  -- Password Modal
  ('progressSection.passwordModal.title', 'sv', 'Låst Lärväg', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.message', 'sv', 'Denna lärväg är låst', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.enterPassword', 'sv', 'Ange lösenord för att låsa upp:', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.passwordPlaceholder', 'sv', 'Ange lösenord', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.unlock', 'sv', 'Lås upp', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.incorrectPassword', 'sv', 'Felaktigt lösenord', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.incorrectPasswordMessage', 'sv', 'Lösenordet du angav är felaktigt', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add English translations for ProgressSection
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- Progress Section Status Messages
  ('progressSection.viewingAs', 'en', 'Viewing as:', 'mobile', NOW(), NOW()),
  ('progressSection.lastAction', 'en', 'Last:', 'mobile', NOW(), NOW()),
  ('progressSection.unknown', 'en', 'Unknown', 'mobile', NOW(), NOW()),
  ('progressSection.locked', 'en', 'LOCKED', 'mobile', NOW(), NOW()),
  ('progressSection.markedComplete', 'en', 'Marked complete', 'mobile', NOW(), NOW()),
  ('progressSection.markedIncomplete', 'en', 'Marked incomplete', 'mobile', NOW(), NOW()),
  ('progressSection.repetition', 'en', 'Repetition', 'mobile', NOW(), NOW()),
  ('progressSection.completed', 'en', 'completed', 'mobile', NOW(), NOW()),
  ('progressSection.by', 'en', 'by', 'mobile', NOW(), NOW()),
  ('progressSection.at', 'en', 'at', 'mobile', NOW(), NOW()),
  
  -- Password Modal
  ('progressSection.passwordModal.title', 'en', 'Locked Learning Path', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.message', 'en', 'This learning path is locked', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.enterPassword', 'en', 'Enter password to unlock:', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.passwordPlaceholder', 'en', 'Enter password', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.unlock', 'en', 'Unlock', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.incorrectPassword', 'en', 'Incorrect Password', 'mobile', NOW(), NOW()),
  ('progressSection.passwordModal.incorrectPasswordMessage', 'en', 'The password you entered is incorrect', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the translations were added
SELECT key, language, value 
FROM translations 
WHERE key LIKE 'progressSection%'
ORDER BY key, language;