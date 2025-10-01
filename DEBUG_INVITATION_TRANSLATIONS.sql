-- DEBUG: Check if invitation translations exist in database
-- Run this to verify the translations are actually there

SELECT 
  key,
  language,
  value,
  platform,
  updated_at
FROM translations
WHERE key IN (
  'invitations.newInvitations',
  'invitations.personalMessage',
  'invitations.supervisorInvitation',
  'invitations.supervisorMessage',
  'invitations.accept',
  'invitations.decline',
  'invitations.dismiss'
)
AND platform = 'mobile'
ORDER BY key, language;

-- Also check if there are any with NULL platform that might conflict
SELECT 
  key,
  language,
  value,
  platform,
  updated_at
FROM translations
WHERE key IN (
  'invitations.newInvitations',
  'invitations.personalMessage'
)
AND platform IS NULL
ORDER BY key, language;

