-- Collection Sharing Modal Translations
-- English and Swedish translations for the collection sharing functionality

-- English translations
INSERT INTO translations (key, language, value, platform, created_at, updated_at) VALUES
-- Collection Sharing Modal
('collectionSharing.shareCollection', 'en', 'Share Collection', 'mobile', NOW(), NOW()),
('collectionSharing.collectionName', 'en', 'Collection', 'mobile', NOW(), NOW()),
('collectionSharing.searchUsers', 'en', 'Search Users', 'mobile', NOW(), NOW()),
('collectionSharing.searchPlaceholder', 'en', 'Search by name or email...', 'mobile', NOW(), NOW()),
('collectionSharing.selectedUsers', 'en', 'Selected Users', 'mobile', NOW(), NOW()),
('collectionSharing.noUsersFound', 'en', 'No users found', 'mobile', NOW(), NOW()),
('collectionSharing.message', 'en', 'Message (Optional)', 'mobile', NOW(), NOW()),
('collectionSharing.messagePlaceholder', 'en', 'Add a personal message...', 'mobile', NOW(), NOW()),
('collectionSharing.sendInvitations', 'en', 'Send Invitations', 'mobile', NOW(), NOW()),
('collectionSharing.sending', 'en', 'Sending...', 'mobile', NOW(), NOW()),
('collectionSharing.selectUsersRequired', 'en', 'Please select at least one user', 'mobile', NOW(), NOW()),
('collectionSharing.invitationsSent', 'en', 'Invitations Sent', 'mobile', NOW(), NOW()),
('collectionSharing.invitationsSentMessage', 'en', '{count} invitation(s) sent successfully', 'mobile', NOW(), NOW()),
('collectionSharing.failedToSend', 'en', 'Failed to send invitations', 'mobile', NOW(), NOW()),

-- Swedish translations
('collectionSharing.shareCollection', 'sv', 'Dela Samling', 'mobile', NOW(), NOW()),
('collectionSharing.collectionName', 'sv', 'Samling', 'mobile', NOW(), NOW()),
('collectionSharing.searchUsers', 'sv', 'Sök Användare', 'mobile', NOW(), NOW()),
('collectionSharing.searchPlaceholder', 'sv', 'Sök efter namn eller e-post...', 'mobile', NOW(), NOW()),
('collectionSharing.selectedUsers', 'sv', 'Valda Användare', 'mobile', NOW(), NOW()),
('collectionSharing.noUsersFound', 'sv', 'Inga användare hittades', 'mobile', NOW(), NOW()),
('collectionSharing.message', 'sv', 'Meddelande (Valfritt)', 'mobile', NOW(), NOW()),
('collectionSharing.messagePlaceholder', 'sv', 'Lägg till ett personligt meddelande...', 'mobile', NOW(), NOW()),
('collectionSharing.sendInvitations', 'sv', 'Skicka Inbjudningar', 'mobile', NOW(), NOW()),
('collectionSharing.sending', 'sv', 'Skickar...', 'mobile', NOW(), NOW()),
('collectionSharing.selectUsersRequired', 'sv', 'Välj minst en användare', 'mobile', NOW(), NOW()),
('collectionSharing.invitationsSent', 'sv', 'Inbjudningar Skickade', 'mobile', NOW(), NOW()),
('collectionSharing.invitationsSentMessage', 'sv', '{count} inbjudning(ar) skickade framgångsrikt', 'mobile', NOW(), NOW()),
('collectionSharing.failedToSend', 'sv', 'Misslyckades att skicka inbjudningar', 'mobile', NOW(), NOW());

-- Update existing translations if they exist
UPDATE translations SET value = 'Share Collection' WHERE key = 'collectionSharing.shareCollection' AND language = 'en';
UPDATE translations SET value = 'Dela Samling' WHERE key = 'collectionSharing.shareCollection' AND language = 'sv';

UPDATE translations SET value = 'Collection' WHERE key = 'collectionSharing.collectionName' AND language = 'en';
UPDATE translations SET value = 'Samling' WHERE key = 'collectionSharing.collectionName' AND language = 'sv';

UPDATE translations SET value = 'Search Users' WHERE key = 'collectionSharing.searchUsers' AND language = 'en';
UPDATE translations SET value = 'Sök Användare' WHERE key = 'collectionSharing.searchUsers' AND language = 'sv';

UPDATE translations SET value = 'Search by name or email...' WHERE key = 'collectionSharing.searchPlaceholder' AND language = 'en';
UPDATE translations SET value = 'Sök efter namn eller e-post...' WHERE key = 'collectionSharing.searchPlaceholder' AND language = 'sv';

UPDATE translations SET value = 'Selected Users' WHERE key = 'collectionSharing.selectedUsers' AND language = 'en';
UPDATE translations SET value = 'Valda Användare' WHERE key = 'collectionSharing.selectedUsers' AND language = 'sv';

UPDATE translations SET value = 'No users found' WHERE key = 'collectionSharing.noUsersFound' AND language = 'en';
UPDATE translations SET value = 'Inga användare hittades' WHERE key = 'collectionSharing.noUsersFound' AND language = 'sv';

UPDATE translations SET value = 'Message (Optional)' WHERE key = 'collectionSharing.message' AND language = 'en';
UPDATE translations SET value = 'Meddelande (Valfritt)' WHERE key = 'collectionSharing.message' AND language = 'sv';

UPDATE translations SET value = 'Add a personal message...' WHERE key = 'collectionSharing.messagePlaceholder' AND language = 'en';
UPDATE translations SET value = 'Lägg till ett personligt meddelande...' WHERE key = 'collectionSharing.messagePlaceholder' AND language = 'sv';

UPDATE translations SET value = 'Send Invitations' WHERE key = 'collectionSharing.sendInvitations' AND language = 'en';
UPDATE translations SET value = 'Skicka Inbjudningar' WHERE key = 'collectionSharing.sendInvitations' AND language = 'sv';

UPDATE translations SET value = 'Sending...' WHERE key = 'collectionSharing.sending' AND language = 'en';
UPDATE translations SET value = 'Skickar...' WHERE key = 'collectionSharing.sending' AND language = 'sv';

UPDATE translations SET value = 'Please select at least one user' WHERE key = 'collectionSharing.selectUsersRequired' AND language = 'en';
UPDATE translations SET value = 'Välj minst en användare' WHERE key = 'collectionSharing.selectUsersRequired' AND language = 'sv';

UPDATE translations SET value = 'Invitations Sent' WHERE key = 'collectionSharing.invitationsSent' AND language = 'en';
UPDATE translations SET value = 'Inbjudningar Skickade' WHERE key = 'collectionSharing.invitationsSent' AND language = 'sv';

UPDATE translations SET value = '{count} invitation(s) sent successfully' WHERE key = 'collectionSharing.invitationsSentMessage' AND language = 'en';
UPDATE translations SET value = '{count} inbjudning(ar) skickade framgångsrikt' WHERE key = 'collectionSharing.invitationsSentMessage' AND language = 'sv';

UPDATE translations SET value = 'Failed to send invitations' WHERE key = 'collectionSharing.failedToSend' AND language = 'en';
UPDATE translations SET value = 'Misslyckades att skicka inbjudningar' WHERE key = 'collectionSharing.failedToSend' AND language = 'sv';