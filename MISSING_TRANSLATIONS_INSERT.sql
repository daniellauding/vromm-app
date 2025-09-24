-- Missing Translations INSERT SQL
-- This script adds all missing translation keys for the components mentioned
-- Using individual INSERT statements to avoid duplicate key conflicts

-- InvitationModal.tsx translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'invitations.supervisorInvitation', 'en', 'Supervisor Invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.supervisorInvitation', 'sv', 'Handledarinbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.studentInvitation', 'en', 'Student Invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.studentInvitation', 'sv', 'Elevinbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.supervisorMessage', 'en', 'wants you to be their supervisor', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.supervisorMessage', 'sv', 'vill att du ska vara deras handledare', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.studentMessage', 'en', 'wants you to be their student', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.studentMessage', 'sv', 'vill att du ska vara deras elev', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionInvitation', 'en', 'Collection Invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionInvitation', 'sv', 'Samlingsinbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionMessage', 'en', 'wants to share a collection with you', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionMessage', 'sv', 'vill dela en samling med dig', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.accepted', 'en', 'Invitation Accepted', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.accepted', 'sv', 'Inbjudan accepterad', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.relationshipAccepted', 'en', 'You are now connected!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.relationshipAccepted', 'sv', 'Ni är nu anslutna!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionAccepted', 'en', 'You now have access to this collection!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.collectionAccepted', 'sv', 'Du har nu tillgång till denna samling!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.acceptError', 'en', 'Failed to accept invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.acceptError', 'sv', 'Misslyckades att acceptera inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.declineError', 'en', 'Failed to decline invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.declineError', 'sv', 'Misslyckades att avslå inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.personalMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.newInvitations', 'en', 'New Invitations', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.newInvitations', 'sv', 'Nya inbjudningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.dismissAll', 'en', 'Dismiss All', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.dismissAll', 'sv', 'Avfärda alla', 'mobile', NOW(), NOW()),
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
(gen_random_uuid(), 'invitations.errorDeclining', 'en', 'Error declining invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.errorDeclining', 'sv', 'Fel vid avslå av inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToDecline', 'en', 'Failed to decline invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'invitations.failedToDecline', 'sv', 'Misslyckades att avslå inbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- WeeklyGoal.tsx translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
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
(gen_random_uuid(), 'weeklyGoals.howItWorksTitle', 'sv', 'Så fungerar veckomål', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Push Notifications translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'pushNotifications.title', 'en', 'Push Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.title', 'sv', 'Push-notifieringar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.failedToken', 'en', 'Failed to get push token for push notification!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.failedToken', 'sv', 'Misslyckades att få push-token för push-notifiering!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.physicalDevice', 'en', 'Must use physical device for Push Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'pushNotifications.physicalDevice', 'sv', 'Måste använda fysisk enhet för Push-notifieringar', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- ProgressSection viewing user translation
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'progressSection.viewingAs', 'en', 'Viewing as:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'progressSection.viewingAs', 'sv', 'Visar som:', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
