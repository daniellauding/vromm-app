-- Debug translations - check what's missing
SELECT key, language, value, platform 
FROM translations 
WHERE key LIKE 'weeklyGoals%'
ORDER BY key, language;

-- Check if any translations are missing
SELECT 'Missing WeeklyGoal translations' as status
WHERE NOT EXISTS (
  SELECT 1 FROM translations 
  WHERE key = 'weeklyGoals.title' AND language = 'en' AND platform = 'mobile'
);

-- Check push notifications
SELECT key, language, value, platform 
FROM translations 
WHERE key LIKE 'pushNotifications%'
ORDER BY key, language;

-- Check invitations
SELECT key, language, value, platform 
FROM translations 
WHERE key LIKE 'invitations%'
ORDER BY key, language;

-- Check progressSection
SELECT key, language, value, platform 
FROM translations 
WHERE key LIKE 'progressSection%'
ORDER BY key, language;
