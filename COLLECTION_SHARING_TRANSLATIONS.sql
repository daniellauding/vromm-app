-- Collection Sharing Translations
-- Add translation keys for collection sharing functionality

INSERT INTO translations (key, language, value) VALUES
-- Collection Sharing Modal
('collectionSharing.shareCollection', 'en', 'Share Collection'),
('collectionSharing.shareCollection', 'sv', 'Dela Samling'),
('collectionSharing.collectionName', 'en', 'Collection'),
('collectionSharing.collectionName', 'sv', 'Samling'),
('collectionSharing.inviteUser', 'en', 'Invite User'),
('collectionSharing.inviteUser', 'sv', 'Bjud in Användare'),
('collectionSharing.emailPlaceholder', 'en', 'Enter email address'),
('collectionSharing.emailPlaceholder', 'sv', 'Ange e-postadress'),
('collectionSharing.message', 'en', 'Message (Optional)'),
('collectionSharing.message', 'sv', 'Meddelande (Valfritt)'),
('collectionSharing.messagePlaceholder', 'en', 'Add a personal message...'),
('collectionSharing.messagePlaceholder', 'sv', 'Lägg till ett personligt meddelande...'),
('collectionSharing.sendInvitation', 'en', 'Send Invitation'),
('collectionSharing.sendInvitation', 'sv', 'Skicka Inbjudan'),
('collectionSharing.sending', 'en', 'Sending...'),
('collectionSharing.sending', 'sv', 'Skickar...'),

-- Collection Sharing Messages
('collectionSharing.invitationSent', 'en', 'Invitation Sent'),
('collectionSharing.invitationSent', 'sv', 'Inbjudan Skickad'),
('collectionSharing.invitationSentMessage', 'en', 'Invitation sent to {email}'),
('collectionSharing.invitationSentMessage', 'sv', 'Inbjudan skickad till {email}'),
('collectionSharing.failedToSend', 'en', 'Failed to send invitation'),
('collectionSharing.failedToSend', 'sv', 'Misslyckades att skicka inbjudan'),
('collectionSharing.emailRequired', 'en', 'Email is required'),
('collectionSharing.emailRequired', 'sv', 'E-post krävs'),

-- Collection Invitation Notifications
('collectionSharing.collectionInvitations', 'en', 'Collection Invitations'),
('collectionSharing.collectionInvitations', 'sv', 'Samlingsinbjudningar'),
('collectionSharing.invitedBy', 'en', 'Invited by {name}'),
('collectionSharing.invitedBy', 'sv', 'Inbjuden av {name}'),
('collectionSharing.invitationAccepted', 'en', 'Invitation Accepted'),
('collectionSharing.invitationAccepted', 'sv', 'Inbjudan Accepterad'),
('collectionSharing.youCanNowAccess', 'en', 'You can now access this collection'),
('collectionSharing.youCanNowAccess', 'sv', 'Du kan nu komma åt denna samling'),
('collectionSharing.invitationRejected', 'en', 'Invitation Rejected'),
('collectionSharing.invitationRejected', 'sv', 'Inbjudan Avvisad'),
('collectionSharing.invitationDeclined', 'en', 'Invitation declined'),
('collectionSharing.invitationDeclined', 'sv', 'Inbjudan avvisad'),
('collectionSharing.failedToAccept', 'en', 'Failed to accept invitation'),
('collectionSharing.failedToAccept', 'sv', 'Misslyckades att acceptera inbjudan'),
('collectionSharing.failedToReject', 'en', 'Failed to reject invitation'),
('collectionSharing.failedToReject', 'sv', 'Misslyckades att avvisa inbjudan'),
('collectionSharing.dismissAll', 'en', 'Dismiss All'),
('collectionSharing.dismissAll', 'sv', 'Avvisa Alla'),
('collectionSharing.dismissAllConfirm', 'en', 'Are you sure you want to dismiss all pending invitations?'),
('collectionSharing.dismissAllConfirm', 'sv', 'Är du säker på att du vill avvisa alla väntande inbjudningar?'),

-- Common
('common.processing', 'en', 'Processing...'),
('common.processing', 'sv', 'Bearbetar...'),
('common.dismiss', 'en', 'Dismiss'),
('common.dismiss', 'sv', 'Avvisa')
ON CONFLICT (key, language) DO UPDATE SET value = EXCLUDED.value;
