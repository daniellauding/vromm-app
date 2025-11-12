-- UI translations for notification buttons and labels
-- Run this SQL in Supabase SQL Editor

INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") 
VALUES 
-- Accept/Decline buttons
(gen_random_uuid(), 'common.accept', 'en', 'Accept', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.accept', 'sv', 'Acceptera', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'common.decline', 'en', 'Decline', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.decline', 'sv', 'Avböj', 'mobile', NOW(), NOW()),

-- Notification sections
(gen_random_uuid(), 'notifications.title', 'en', 'Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.title', 'sv', 'Notifikationer', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archived', 'en', 'Archived Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archived', 'sv', 'Arkiverade notifikationer', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.noNotifications', 'en', 'No notifications yet', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.noNotifications', 'sv', 'Inga notifikationer än', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.noArchived', 'en', 'No archived notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.noArchived', 'sv', 'Inga arkiverade notifikationer', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.willAppearHere', 'en', 'You''ll see notifications here when you receive them', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.willAppearHere', 'sv', 'Du kommer att se notifikationer här när du får dem', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archivedWillAppear', 'en', 'Archived notifications will appear here when you archive them', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archivedWillAppear', 'sv', 'Arkiverade notifikationer visas här när du arkiverar dem', 'mobile', NOW(), NOW()),

-- Bulk actions
(gen_random_uuid(), 'notifications.clearAll', 'en', 'Clear All', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.clearAll', 'sv', 'Rensa alla', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAll', 'en', 'Archive All', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAll', 'sv', 'Arkivera alla', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiving', 'en', 'Archiving...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiving', 'sv', 'Arkiverar...', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.allCleared', 'en', 'All notifications cleared', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.allCleared', 'sv', 'Alla notifikationer rensade', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.allArchived', 'en', 'All notifications archived', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.allArchived', 'sv', 'Alla notifikationer arkiverade', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.clearError', 'en', 'Failed to clear notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.clearError', 'sv', 'Misslyckades att rensa notifikationer', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveError', 'en', 'Failed to archive all notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveError', 'sv', 'Misslyckades att arkivera alla notifikationer', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllConfirm', 'en', 'Archive All Notifications?', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm', 'sv', 'Arkivera alla notifikationer?', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllDescription', 'en', 'This will archive all your notifications. You can view archived notifications later.', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllDescription', 'sv', 'Detta kommer att arkivera alla dina notifikationer. Du kan visa arkiverade notifikationer senare.', 'mobile', NOW(), NOW()),

-- Common
(gen_random_uuid(), 'common.success', 'en', 'Success', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.success', 'sv', 'Lyckades', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'common.error', 'en', 'Error', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.error', 'sv', 'Fel', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'common.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'common.processing', 'en', 'Processing...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'common.processing', 'sv', 'Bearbetar...', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

