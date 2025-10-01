-- VERIFY: Check if these exact translations exist
-- This will show you EXACTLY what's in your database

-- Check invitations.newInvitations
SELECT 'invitations.newInvitations' as checking, * 
FROM translations 
WHERE key = 'invitations.newInvitations';

-- Check invitations.personalMessage  
SELECT 'invitations.personalMessage' as checking, * 
FROM translations 
WHERE key = 'invitations.personalMessage';

-- If the above return 0 rows, we need to INSERT them (not UPDATE)
-- If they DO exist, check the exact values:

-- Count all invitation translations
SELECT 
  COUNT(*) as total_count,
  language,
  platform
FROM translations
WHERE key LIKE 'invitations.%'
GROUP BY language, platform
ORDER BY language, platform;

-- Show ALL invitation translations to see what we have
SELECT key, language, value, platform, updated_at
FROM translations
WHERE key LIKE 'invitations.%'
ORDER BY key, language;

