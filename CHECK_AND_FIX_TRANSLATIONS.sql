-- Check existing translations and add missing ones
-- Using the exact format from your working example

-- First, let's check what translations already exist
SELECT key, language, value, platform 
FROM translations 
WHERE key IN (
  'weeklyGoals.title',
  'home.jumpBackIn', 
  'home.featuredContent',
  'home.learningPath',
  'home.exercise',
  'home.startLearning',
  'home.startExercise',
  'pushNotifications.title',
  'pushNotifications.physicalDevice',
  'invitations.unknownUser',
  'progressSection.viewingAs'
)
ORDER BY key, language;

-- Now insert the missing translations using the exact format from your example
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES 
-- WeeklyGoal translations
(gen_random_uuid(), 'weeklyGoals.title', 'en', 'Weekly Goal', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.title', 'sv', 'Veckomål', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalSettings', 'en', 'Goal Settings', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalSettings', 'sv', 'Målinställningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.dailyGoal', 'en', 'Daily Exercise Goal', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.dailyGoal', 'sv', 'Dagligt övningsmål', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalType', 'en', 'Goal Type', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalType', 'sv', 'Måltyp', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.weekly', 'en', 'Weekly', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.weekly', 'sv', 'Veckovis', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.monthly', 'en', 'Monthly', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.monthly', 'sv', 'Månadsvis', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.saveGoals', 'en', 'Save Goals', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.saveGoals', 'sv', 'Spara mål', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.howItWorksTitle', 'en', 'How Weekly Goals Work', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.howItWorksTitle', 'sv', 'Så fungerar veckomål', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalPerDayText', 'en', 'Goal: {goal} exercises per day', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.goalPerDayText', 'sv', 'Mål: {goal} övningar per dag', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.target', 'en', 'Target:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.target', 'sv', 'Mål:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.exercisesPerWeek', 'en', 'exercises per week', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.exercisesPerWeek', 'sv', 'övningar per vecka', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.exercisesPerMonth', 'en', 'per month', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.exercisesPerMonth', 'sv', 'per månad', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.enterDailyGoal', 'en', 'Enter daily goal', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'weeklyGoals.enterDailyGoal', 'sv', 'Ange dagligt mål', 'mobile', NOW(), NOW()),

-- Home translations
(gen_random_uuid(), 'home.jumpBackIn', 'en', 'Jump back in', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.jumpBackIn', 'sv', 'Hoppa tillbaka', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.featuredContent', 'en', 'Featured Learning', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.featuredContent', 'sv', 'Utvalt innehåll', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.learningPath', 'en', 'Learning Path', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.learningPath', 'sv', 'Lärväg', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.exercise', 'en', 'Exercise', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.exercise', 'sv', 'Övning', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.startLearning', 'en', 'Start Learning', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.startLearning', 'sv', 'Börja lära dig', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.startExercise', 'en', 'Start Exercise', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'home.startExercise', 'sv', 'Starta övning', 'mobile', NOW(), NOW()),

-- Push Notifications
(gen_random_uuid(), 'pushNotifications.title', 'en', 'Push Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.title', 'sv', 'Push-notifieringar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.physicalDevice', 'en', 'Must use physical device for Push Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.physicalDevice', 'sv', 'Måste använda fysisk enhet för Push-notifieringar', 'mobile', NOW(), NOW()),

-- Invitation translations
(gen_random_uuid(), 'invitations.unknownUser', 'en', 'Unknown User', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.unknownUser', 'sv', 'Okänd användare', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.unknownCollection', 'en', 'Unknown Collection', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.unknownCollection', 'sv', 'Okänd samling', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.loadingError', 'en', 'Error loading pending invitations', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.loadingError', 'sv', 'Fel vid laddning av väntande inbjudningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.youAreNowConnected', 'en', 'You are now connected!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.youAreNowConnected', 'sv', 'Ni är nu anslutna!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.youNowHaveAccess', 'en', 'You now have access to this collection!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.youNowHaveAccess', 'sv', 'Du har nu tillgång till denna samling!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToAccept', 'en', 'Failed to accept invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToAccept', 'sv', 'Misslyckades att acceptera inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToDecline', 'en', 'Failed to decline invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToDecline', 'sv', 'Misslyckades att avslå inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW()),

-- ProgressSection translations
(gen_random_uuid(), 'progressSection.viewingAs', 'en', 'Viewing as:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'progressSection.viewingAs', 'sv', 'Visar som:', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the translations were inserted
SELECT key, language, value, platform 
FROM translations 
WHERE key IN (
  'weeklyGoals.title',
  'home.jumpBackIn', 
  'home.featuredContent',
  'home.learningPath',
  'home.exercise',
  'home.startLearning',
  'home.startExercise',
  'pushNotifications.title',
  'pushNotifications.physicalDevice',
  'invitations.unknownUser',
  'progressSection.viewingAs'
)
ORDER BY key, language;
