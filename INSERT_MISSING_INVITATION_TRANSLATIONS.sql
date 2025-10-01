-- INSERT MISSING INVITATION TRANSLATIONS
-- This will ONLY insert if they don't exist (using new UUIDs to avoid conflicts)

-- First, delete any existing ones to avoid conflicts
DELETE FROM translations WHERE key = 'invitations.newInvitations' AND language = 'en' AND platform = 'mobile';
DELETE FROM translations WHERE key = 'invitations.newInvitations' AND language = 'sv' AND platform = 'mobile';
DELETE FROM translations WHERE key = 'invitations.personalMessage' AND language = 'en' AND platform = 'mobile';
DELETE FROM translations WHERE key = 'invitations.personalMessage' AND language = 'sv' AND platform = 'mobile';

-- Now insert fresh ones with new UUIDs
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'invitations.newInvitations', 'en', 'New Invitations', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.newInvitations', 'sv', 'Nya inbjudningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW());

-- Verify they were inserted
SELECT key, language, value, platform, created_at
FROM translations
WHERE key IN ('invitations.newInvitations', 'invitations.personalMessage')
ORDER BY key, language;

