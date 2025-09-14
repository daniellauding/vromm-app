-- Collection Invitation Modal Translations
-- Swedish and English translations for the collection invitation acceptance modal

-- English translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
-- Collection invitation modal
(gen_random_uuid(), 'collectionInvitation.title', 'en', 'Collection Invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.invitedBy', 'en', 'Invited by', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.customMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accept', 'en', 'Accept', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.reject', 'en', 'Reject', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accepting', 'en', 'Accepting...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejecting', 'en', 'Rejecting...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accepted', 'en', 'Invitation Accepted', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejected', 'en', 'Invitation Rejected', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.acceptedMessage', 'en', 'You have been added to the collection', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejectedMessage', 'en', 'Invitation has been declined', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.error', 'en', 'Error processing invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.errorMessage', 'en', 'Failed to process invitation. Please try again.', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Collection sharing modal improvements (only new keys)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'collectionSharing.modalTitle', 'en', 'Share Collection', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.modalDescription', 'en', 'Search for users to share this collection with', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.noUsersFound', 'en', 'No users found', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.selectedUsers', 'en', 'Selected Users', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.messagePlaceholder', 'en', 'Add a personal message...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.sendInvitations', 'en', 'Send Invitations', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.sending', 'en', 'Sending...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.invitationsSent', 'en', 'Invitations Sent', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.invitationsSentMessage', 'en', '{count} invitation(s) sent successfully', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.failedToSend', 'en', 'Failed to send invitations', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.selectUsersRequired', 'en', 'Please select at least one user', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Swedish translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
-- Collection invitation modal
(gen_random_uuid(), 'collectionInvitation.title', 'sv', 'Samlingsinbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.invitedBy', 'sv', 'Inbjuden av', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.customMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accept', 'sv', 'Acceptera', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.reject', 'sv', 'Avvisa', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accepting', 'sv', 'Accepterar...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejecting', 'sv', 'Avvisar...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.accepted', 'sv', 'Inbjudan Accepterad', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejected', 'sv', 'Inbjudan Avvisad', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.acceptedMessage', 'sv', 'Du har lagts till i samlingen', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.rejectedMessage', 'sv', 'Inbjudan har avvisats', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.error', 'sv', 'Fel vid bearbetning av inbjudan', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionInvitation.errorMessage', 'sv', 'Misslyckades att bearbeta inbjudan. Försök igen.', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Collection sharing modal improvements (only new keys)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
(gen_random_uuid(), 'collectionSharing.modalTitle', 'sv', 'Dela Samling', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.modalDescription', 'sv', 'Sök efter användare att dela denna samling med', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.noUsersFound', 'sv', 'Inga användare hittades', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.selectedUsers', 'sv', 'Valda Användare', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.messagePlaceholder', 'sv', 'Lägg till ett personligt meddelande...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.sendInvitations', 'sv', 'Skicka Inbjudningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.sending', 'sv', 'Skickar...', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.invitationsSent', 'sv', 'Inbjudningar Skickade', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.invitationsSentMessage', 'sv', '{count} inbjudning(ar) skickade framgångsrikt', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.failedToSend', 'sv', 'Misslyckades att skicka inbjudningar', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'collectionSharing.selectUsersRequired', 'sv', 'Välj minst en användare', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Leave collection translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
-- English
(gen_random_uuid(), 'routeCollections.left', 'en', 'Left Collection', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'routeCollections.leftMessage', 'en', 'You have left "{name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'routeCollections.failedToLeave', 'en', 'Failed to leave collection', 'mobile', NOW(), NOW()),
-- Swedish
(gen_random_uuid(), 'routeCollections.left', 'sv', 'Lämnade Samling', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'routeCollections.leftMessage', 'sv', 'Du har lämnat "{name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'routeCollections.failedToLeave', 'sv', 'Misslyckades att lämna samling', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();