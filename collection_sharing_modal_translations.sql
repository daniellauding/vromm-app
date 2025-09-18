-- Collection Sharing Modal Translations
-- Swedish and English translations for the CollectionSharingModal component

-- Swedish translations
INSERT INTO translations (id, key, value, language, created_at, updated_at) VALUES
-- Modal titles and headers
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'collectionSharing.title', 'Dela samling', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'collectionSharing.subtitle', 'Sök efter användare för att dela denna samling med', 'sv', NOW(), NOW()),

-- Collection information
('a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'collectionSharing.youAreOwner', 'Du är ägaren', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567893', 'collectionSharing.youAreMember', 'Du är medlem', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567894', 'collectionSharing.collectionName', 'Samling', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567895', 'collectionSharing.visibility', 'Synlighet', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567896', 'collectionSharing.routeCount', 'Rutter', 'sv', NOW(), NOW()),

-- Member management
('a1b2c3d4-e5f6-7890-abcd-ef1234567897', 'collectionSharing.collectionMembers', 'Samlingsmedlemmar', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567898', 'collectionSharing.you', 'Du', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567899', 'collectionSharing.owner', 'ÄGARE', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567900', 'collectionSharing.member', 'MEDLEM', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567901', 'collectionSharing.pending', 'VÄNTAR', 'sv', NOW(), NOW()),

-- Role management
('a1b2c3d4-e5f6-7890-abcd-ef1234567902', 'roleManagement.title', 'Ändra roll', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567903', 'roleManagement.viewer', 'Visare', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567904', 'roleManagement.editor', 'Redigerare', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567905', 'roleManagement.roleUpdated', 'Roll uppdaterad', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567906', 'roleManagement.roleUpdatedMessage', 'Användarrollen har uppdaterats framgångsrikt', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567907', 'roleManagement.failedToUpdateRole', 'Misslyckades att uppdatera användarroll', 'sv', NOW(), NOW()),

-- User management
('a1b2c3d4-e5f6-7890-abcd-ef1234567908', 'collectionMembers.removeUser', 'Ta bort', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567909', 'collectionMembers.pendingInvitation', 'Väntande inbjudan', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567910', 'collectionMembers.cancelInvitation', 'Avbryt inbjudan', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567911', 'collectionMembers.userRemoved', 'Användare borttagen', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567912', 'collectionMembers.userRemovedMessage', '{userName} har tagits bort från samlingen', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567913', 'collectionMembers.failedToRemoveUser', 'Misslyckades att ta bort användare från samlingen', 'sv', NOW(), NOW()),

-- Membership management
('a1b2c3d4-e5f6-7890-abcd-ef1234567914', 'collectionSharing.yourMembership', 'Ditt medlemskap', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567915', 'collectionSharing.leaveCollection', 'Lämna samling', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567916', 'collectionSharing.leftCollection', 'Lämnade samling', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567917', 'collectionSharing.leftCollectionSuccess', 'Du har lämnat "{collectionName}"', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567918', 'collectionSharing.failedToLeaveCollection', 'Misslyckades att lämna samlingen', 'sv', NOW(), NOW()),

-- User search
('a1b2c3d4-e5f6-7890-abcd-ef1234567919', 'collectionSharing.searchUsers', 'Sök efter användare', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567920', 'collectionSharing.searchUsersPlaceholder', 'Sök efter namn eller e-post...', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567921', 'collectionSharing.noUsersFound', 'Inga användare hittades', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567922', 'collectionSharing.selectedUsers', 'Valda användare', 'sv', NOW(), NOW()),

-- Messages
('a1b2c3d4-e5f6-7890-abcd-ef1234567923', 'collectionSharing.optionalMessage', 'Valfritt meddelande', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567924', 'collectionSharing.messagePlaceholder', 'Lägg till ett personligt meddelande...', 'sv', NOW(), NOW()),

-- Invitations
('a1b2c3d4-e5f6-7890-abcd-ef1234567925', 'collectionSharing.invitationsSent', 'Inbjudningar skickade', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567926', 'collectionSharing.invitationsSentMessage', '{count} inbjudning(ar) skickade framgångsrikt', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567927', 'collectionSharing.noNewInvitations', 'Inga nya inbjudningar', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567928', 'collectionSharing.failedToSendInvitations', 'Misslyckades att skicka inbjudningar', 'sv', NOW(), NOW()),

-- Buttons
('a1b2c3d4-e5f6-7890-abcd-ef1234567929', 'collectionSharing.sendInvitations', 'Skicka inbjudningar', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567930', 'collectionSharing.cancel', 'Avbryt', 'sv', NOW(), NOW()),

-- Invitation cancellation
('a1b2c3d4-e5f6-7890-abcd-ef1234567931', 'collectionMembers.invitationCanceled', 'Inbjudan avbruten', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567932', 'collectionMembers.invitationCanceledMessage', 'Inbjudan för {userName} har avbrutits', 'sv', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567933', 'collectionMembers.failedToCancelInvitation', 'Misslyckades att avbryta inbjudan', 'sv', NOW(), NOW()),

-- English translations
('b1c2d3e4-f5g6-7890-bcde-fg1234567890', 'collectionSharing.title', 'Share Collection', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567891', 'collectionSharing.subtitle', 'Search for users to share this collection with', 'en', NOW(), NOW()),

-- Collection information
('b1c2d3e4-f5g6-7890-bcde-fg1234567892', 'collectionSharing.youAreOwner', 'You are the owner', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567893', 'collectionSharing.youAreMember', 'You are a member', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567894', 'collectionSharing.collectionName', 'Collection', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567895', 'collectionSharing.visibility', 'Visibility', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567896', 'collectionSharing.routeCount', 'Routes', 'en', NOW(), NOW()),

-- Member management
('b1c2d3e4-f5g6-7890-bcde-fg1234567897', 'collectionSharing.collectionMembers', 'Collection Members', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567898', 'collectionSharing.you', 'You', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567899', 'collectionSharing.owner', 'OWNER', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567900', 'collectionSharing.member', 'MEMBER', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567901', 'collectionSharing.pending', 'PENDING', 'en', NOW(), NOW()),

-- Role management
('b1c2d3e4-f5g6-7890-bcde-fg1234567902', 'roleManagement.title', 'Change Role', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567903', 'roleManagement.viewer', 'Viewer', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567904', 'roleManagement.editor', 'Editor', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567905', 'roleManagement.roleUpdated', 'Role Updated', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567906', 'roleManagement.roleUpdatedMessage', 'User role has been updated successfully', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567907', 'roleManagement.failedToUpdateRole', 'Failed to update user role', 'en', NOW(), NOW()),

-- User management
('b1c2d3e4-f5g6-7890-bcde-fg1234567908', 'collectionMembers.removeUser', 'Remove', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567909', 'collectionMembers.pendingInvitation', 'Pending Invitation', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567910', 'collectionMembers.cancelInvitation', 'Cancel Invitation', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567911', 'collectionMembers.userRemoved', 'User Removed', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567912', 'collectionMembers.userRemovedMessage', '{userName} has been removed from the collection', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567913', 'collectionMembers.failedToRemoveUser', 'Failed to remove user from collection', 'en', NOW(), NOW()),

-- Membership management
('b1c2d3e4-f5g6-7890-bcde-fg1234567914', 'collectionSharing.yourMembership', 'Your Membership', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567915', 'collectionSharing.leaveCollection', 'Leave Collection', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567916', 'collectionSharing.leftCollection', 'Left Collection', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567917', 'collectionSharing.leftCollectionSuccess', 'You have left "{collectionName}"', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567918', 'collectionSharing.failedToLeaveCollection', 'Failed to leave collection', 'en', NOW(), NOW()),

-- User search
('b1c2d3e4-f5g6-7890-bcde-fg1234567919', 'collectionSharing.searchUsers', 'Search for users', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567920', 'collectionSharing.searchUsersPlaceholder', 'Search by name or email...', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567921', 'collectionSharing.noUsersFound', 'No users found', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567922', 'collectionSharing.selectedUsers', 'Selected Users', 'en', NOW(), NOW()),

-- Messages
('b1c2d3e4-f5g6-7890-bcde-fg1234567923', 'collectionSharing.optionalMessage', 'Optional message', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567924', 'collectionSharing.messagePlaceholder', 'Add a personal message...', 'en', NOW(), NOW()),

-- Invitations
('b1c2d3e4-f5g6-7890-bcde-fg1234567925', 'collectionSharing.invitationsSent', 'Invitations Sent', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567926', 'collectionSharing.invitationsSentMessage', '{count} invitation(s) sent successfully', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567927', 'collectionSharing.noNewInvitations', 'No New Invitations', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567928', 'collectionSharing.failedToSendInvitations', 'Failed to send invitations', 'en', NOW(), NOW()),

-- Buttons
('b1c2d3e4-f5g6-7890-bcde-fg1234567929', 'collectionSharing.sendInvitations', 'Send Invitations', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567930', 'collectionSharing.cancel', 'Cancel', 'en', NOW(), NOW()),

-- Invitation cancellation
('b1c2d3e4-f5g6-7890-bcde-fg1234567931', 'collectionMembers.invitationCanceled', 'Invitation Canceled', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567932', 'collectionMembers.invitationCanceledMessage', 'Invitation for {userName} has been canceled', 'en', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-fg1234567933', 'collectionMembers.failedToCancelInvitation', 'Failed to cancel invitation', 'en', NOW(), NOW());
