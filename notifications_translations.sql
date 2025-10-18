-- Notifications translations for mobile platform
-- Run this SQL in Supabase SQL Editor
-- Using gen_random_uuid() to generate unique IDs

INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES 
-- Notifications header
(gen_random_uuid(), 'notifications.title', 'en', 'Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.title', 'sv', 'Meddelanden', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archivedTitle', 'en', 'Archived Notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archivedTitle', 'sv', 'Arkiverade Meddelanden', 'mobile', NOW(), NOW()),

-- Actions
(gen_random_uuid(), 'notifications.markAllRead', 'en', 'Mark All as Read', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.markAllRead', 'sv', 'Markera alla som lästa', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAll', 'en', 'Archive All', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAll', 'sv', 'Arkivera alla', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.actions', 'en', 'Actions', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.actions', 'sv', 'Åtgärder', 'mobile', NOW(), NOW()),

-- Toggle buttons
(gen_random_uuid(), 'notifications.showActive', 'en', 'Active', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.showActive', 'sv', 'Aktiva', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.showArchived', 'en', 'Archived', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.showArchived', 'sv', 'Arkiverade', 'mobile', NOW(), NOW()),

-- Processing states
(gen_random_uuid(), 'notifications.processing', 'en', 'Processing...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.processing', 'sv', 'Bearbetar...', 'mobile', NOW(), NOW()),

-- Confirmation dialogs
(gen_random_uuid(), 'notifications.archiveAllConfirm.title', 'en', 'Archive All Notifications?', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm.title', 'sv', 'Arkivera alla meddelanden?', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllConfirm.message', 'en', 'This will archive all your notifications. You can view archived notifications later.', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm.message', 'sv', 'Detta kommer arkivera alla dina meddelanden. Du kan visa arkiverade meddelanden senare.', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllConfirm.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllConfirm.confirm', 'en', 'Archive All', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm.confirm', 'sv', 'Arkivera alla', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.archiveAllConfirm.archiving', 'en', 'Archiving...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.archiveAllConfirm.archiving', 'sv', 'Arkiverar...', 'mobile', NOW(), NOW()),

-- Success/Error messages
(gen_random_uuid(), 'notifications.success.markedAllRead', 'en', 'All notifications marked as read', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.success.markedAllRead', 'sv', 'Alla meddelanden markerade som lästa', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.success.archivedAll', 'en', 'All notifications archived', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.success.archivedAll', 'sv', 'Alla meddelanden arkiverade', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.error.markAllFailed', 'en', 'Failed to mark all notifications as read', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.error.markAllFailed', 'sv', 'Kunde inte markera alla meddelanden som lästa', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.error.archiveAllFailed', 'en', 'Failed to archive all notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.error.archiveAllFailed', 'sv', 'Kunde inte arkivera alla meddelanden', 'mobile', NOW(), NOW()),

-- Empty states
(gen_random_uuid(), 'notifications.empty.active.title', 'en', 'No notifications yet', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.empty.active.title', 'sv', 'Inga meddelanden ännu', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.empty.active.message', 'en', 'You''ll see notifications here when you receive them', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.empty.active.message', 'sv', 'Du kommer se meddelanden här när du får dem', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.empty.archived.title', 'en', 'No archived notifications', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.empty.archived.title', 'sv', 'Inga arkiverade meddelanden', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notifications.empty.archived.message', 'en', 'Archived notifications will appear here when you archive them', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.empty.archived.message', 'sv', 'Arkiverade meddelanden visas här när du arkiverar dem', 'mobile', NOW(), NOW()),

-- Loading
(gen_random_uuid(), 'notifications.loading', 'en', 'Loading notifications...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notifications.loading', 'sv', 'Laddar meddelanden...', 'mobile', NOW(), NOW());
