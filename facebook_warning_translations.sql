-- Facebook Warning Modal Translations
-- Copy and paste these into your Supabase SQL editor

-- English translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'auth.facebookWarning.title', 'en', 'Facebook Login Notice', 'mobile', NOW(), NOW()),
('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.message', 'en', 'We are currently experiencing issues with Facebook login. After logging in, you will need to restart the app to complete the login process.', 'mobile', NOW(), NOW()),
('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.important', 'en', 'Important:', 'mobile', NOW(), NOW()),
('6ba7b812-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.instruction', 'en', 'Please restart the app after Facebook login to ensure you are properly logged in.', 'mobile', NOW(), NOW()),
('6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.continue', 'en', 'Continue', 'mobile', NOW(), NOW());

-- Swedish translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('6ba7b815-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.title', 'sv', 'Facebook-inloggning Meddelande', 'mobile', NOW(), NOW()),
('6ba7b816-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.message', 'sv', 'Vi upplever för närvarande problem med Facebook-inloggning. Efter inloggning behöver du starta om appen för att slutföra inloggningsprocessen.', 'mobile', NOW(), NOW()),
('6ba7b817-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.important', 'sv', 'Viktigt:', 'mobile', NOW(), NOW()),
('6ba7b818-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.instruction', 'sv', 'Vänligen starta om appen efter Facebook-inloggning för att säkerställa att du är korrekt inloggad.', 'mobile', NOW(), NOW()),
('6ba7b819-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),
('6ba7b81a-9dad-11d1-80b4-00c04fd430c8', 'auth.facebookWarning.continue', 'sv', 'Fortsätt', 'mobile', NOW(), NOW());
