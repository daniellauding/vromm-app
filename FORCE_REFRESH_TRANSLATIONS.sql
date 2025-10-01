-- Force refresh all translations by updating the updated_at timestamp
-- This will force the app to reload translations

UPDATE translations 
SET updated_at = NOW()
WHERE key IN (
  'weeklyGoals.title',
  'weeklyGoals.goalSettings', 
  'weeklyGoals.dailyGoal',
  'weeklyGoals.goalType',
  'weeklyGoals.weekly',
  'weeklyGoals.monthly',
  'weeklyGoals.cancel',
  'weeklyGoals.saveGoals',
  'weeklyGoals.howItWorksTitle',
  'weeklyGoals.goalPerDayText',
  'weeklyGoals.target',
  'weeklyGoals.exercisesPerWeek',
  'weeklyGoals.exercisesPerMonth',
  'weeklyGoals.enterDailyGoal',
  'home.jumpBackIn',
  'home.featuredContent', 
  'home.learningPath',
  'home.exercise',
  'home.startLearning',
  'home.startExercise',
  'pushNotifications.title',
  'pushNotifications.physicalDevice',
  'invitations.unknownUser',
  'invitations.unknownCollection',
  'invitations.loadingError',
  'invitations.youAreNowConnected',
  'invitations.youNowHaveAccess',
  'invitations.failedToAccept',
  'invitations.failedToDecline',
  'invitations.personalMessage',
  'progressSection.viewingAs'
);

-- Verify the update worked
SELECT key, language, value, updated_at 
FROM translations 
WHERE key IN ('weeklyGoals.title', 'home.jumpBackIn', 'pushNotifications.title')
ORDER BY key, language;
