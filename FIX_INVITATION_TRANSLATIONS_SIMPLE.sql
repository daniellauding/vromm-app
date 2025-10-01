-- Simple fix: Just UPDATE existing translations
-- No need to insert/delete, just update the values

-- Update invitations.newInvitations
UPDATE translations SET value = 'New Invitations', updated_at = NOW() 
WHERE key = 'invitations.newInvitations' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Nya inbjudningar', updated_at = NOW() 
WHERE key = 'invitations.newInvitations' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.personalMessage
UPDATE translations SET value = 'Personal message:', updated_at = NOW() 
WHERE key = 'invitations.personalMessage' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Personligt meddelande:', updated_at = NOW() 
WHERE key = 'invitations.personalMessage' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.supervisorInvitation
UPDATE translations SET value = 'Supervisor Invitation', updated_at = NOW() 
WHERE key = 'invitations.supervisorInvitation' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Handledarinbjudan', updated_at = NOW() 
WHERE key = 'invitations.supervisorInvitation' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.supervisorMessage
UPDATE translations SET value = 'wants you to be their supervisor', updated_at = NOW() 
WHERE key = 'invitations.supervisorMessage' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'vill att du ska vara deras handledare', updated_at = NOW() 
WHERE key = 'invitations.supervisorMessage' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.studentInvitation
UPDATE translations SET value = 'Student Invitation', updated_at = NOW() 
WHERE key = 'invitations.studentInvitation' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Elevinbjudan', updated_at = NOW() 
WHERE key = 'invitations.studentInvitation' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.studentMessage
UPDATE translations SET value = 'wants you to be their student', updated_at = NOW() 
WHERE key = 'invitations.studentMessage' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'vill att du ska vara deras elev', updated_at = NOW() 
WHERE key = 'invitations.studentMessage' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.collectionInvitation
UPDATE translations SET value = 'Collection Invitation', updated_at = NOW() 
WHERE key = 'invitations.collectionInvitation' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Samlingsinbjudan', updated_at = NOW() 
WHERE key = 'invitations.collectionInvitation' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.collectionMessage
UPDATE translations SET value = 'wants to share a collection with you', updated_at = NOW() 
WHERE key = 'invitations.collectionMessage' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'vill dela en samling med dig', updated_at = NOW() 
WHERE key = 'invitations.collectionMessage' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.collectionName
UPDATE translations SET value = 'Collection', updated_at = NOW() 
WHERE key = 'invitations.collectionName' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Samling', updated_at = NOW() 
WHERE key = 'invitations.collectionName' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.dismiss
UPDATE translations SET value = 'Dismiss', updated_at = NOW() 
WHERE key = 'invitations.dismiss' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Avfärda', updated_at = NOW() 
WHERE key = 'invitations.dismiss' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.decline
UPDATE translations SET value = 'Decline', updated_at = NOW() 
WHERE key = 'invitations.decline' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Avvisa', updated_at = NOW() 
WHERE key = 'invitations.decline' AND language = 'sv' AND platform = 'mobile';

-- Update invitations.accept
UPDATE translations SET value = 'Accept', updated_at = NOW() 
WHERE key = 'invitations.accept' AND language = 'en' AND platform = 'mobile';

UPDATE translations SET value = 'Acceptera', updated_at = NOW() 
WHERE key = 'invitations.accept' AND language = 'sv' AND platform = 'mobile';

-- Verify the updates
SELECT key, language, value, platform, updated_at 
FROM translations 
WHERE key LIKE 'invitations.%' 
ORDER BY key, language;

