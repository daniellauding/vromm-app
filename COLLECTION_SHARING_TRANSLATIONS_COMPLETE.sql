-- Complete Collection Sharing Translations
-- Copy and paste this into your Supabase SQL editor

-- Collection Sharing Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'collectionSharing.title', 'en', 'Share Collection', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'collectionSharing.subtitle', 'en', 'Search for users to share this collection with', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'collectionSharing.searchPlaceholder', 'en', 'Search users by name or email...', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567893', 'collectionSharing.sendInvitations', 'en', 'Send Invitations', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567894', 'collectionSharing.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567895', 'collectionSharing.noUsersFound', 'en', 'No users found', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567896', 'collectionSharing.selectedUsers', 'en', 'Selected Users', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567897', 'collectionSharing.removeUser', 'en', 'Remove', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567898', 'collectionSharing.invitationsSent', 'en', 'Invitations sent successfully', 'mobile', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567899', 'collectionSharing.failedToSend', 'en', 'Failed to send invitations', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Collection Sharing Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('b1c2d3e4-f5g6-7890-bcde-f1234567890', 'collectionSharing.title', 'sv', 'Dela Samling', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567891', 'collectionSharing.subtitle', 'sv', 'Sök efter användare att dela denna samling med', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567892', 'collectionSharing.searchPlaceholder', 'sv', 'Sök användare efter namn eller e-post...', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567893', 'collectionSharing.sendInvitations', 'sv', 'Skicka Inbjudningar', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567894', 'collectionSharing.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567895', 'collectionSharing.noUsersFound', 'sv', 'Inga användare hittades', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567896', 'collectionSharing.selectedUsers', 'sv', 'Valda Användare', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567897', 'collectionSharing.removeUser', 'sv', 'Ta bort', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567898', 'collectionSharing.invitationsSent', 'sv', 'Inbjudningar skickade framgångsrikt', 'mobile', NOW(), NOW()),
('b1c2d3e4-f5g6-7890-bcde-f1234567899', 'collectionSharing.failedToSend', 'sv', 'Misslyckades att skicka inbjudningar', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Collection Members Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('c1d2e3f4-g5h6-7890-cdef-1234567890', 'collectionMembers.title', 'en', 'Collection Members', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567891', 'collectionMembers.owner', 'en', 'Owner', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567892', 'collectionMembers.member', 'en', 'Member', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567893', 'collectionMembers.changeRole', 'en', 'Change Role', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567894', 'collectionMembers.removeUser', 'en', 'Remove User', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567895', 'collectionMembers.leaveCollection', 'en', 'Leave Collection', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567896', 'collectionMembers.routeCount', 'en', '{count} routes', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567897', 'collectionMembers.confirmRemove', 'en', 'Are you sure you want to remove this user?', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567898', 'collectionMembers.confirmLeave', 'en', 'Are you sure you want to leave this collection?', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-1234567899', 'roleManagement.title', 'en', 'Change User Role', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789a', 'roleManagement.makeOwner', 'en', 'Make Owner', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789b', 'roleManagement.makeMember', 'en', 'Make Member', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789c', 'roleManagement.roleChanged', 'en', 'User role changed successfully', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789d', 'roleManagement.failedToChange', 'en', 'Failed to change user role', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789e', 'collectionActions.share', 'en', 'Share', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-123456789f', 'collectionActions.edit', 'en', 'Edit', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-12345678a0', 'collectionActions.delete', 'en', 'Delete', 'mobile', NOW(), NOW()),
('c1d2e3f4-g5h6-7890-cdef-12345678a1', 'collectionActions.confirmDelete', 'en', 'Are you sure you want to delete this collection?', 'mobile', NOW(), NOW()),
('e1f2g3h4-i5j6-7890-efgh-3456789012', 'roleManagement.viewer', 'en', 'Viewer', 'mobile', NOW(), NOW()),
('e1f2g3h4-i5j6-7890-efgh-3456789013', 'roleManagement.editor', 'en', 'Editor', 'mobile', NOW(), NOW()),
('e1f2g3h4-i5j6-7890-efgh-3456789014', 'collectionMembers.pendingInvitation', 'en', 'Pending Invitation', 'mobile', NOW(), NOW()),
('e1f2g3h4-i5j6-7890-efgh-3456789015', 'collectionMembers.cancelInvitation', 'en', 'Cancel Invitation', 'mobile', NOW(), NOW()),
('e1f2g3h4-i5j6-7890-efgh-3456789016', 'routeCollections.routeCount', 'en', 'Routes', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Collection Members Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('d1e2f3g4-h5i6-7890-defg-2345678900', 'collectionMembers.title', 'sv', 'Samlingsmedlemmar', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678901', 'collectionMembers.owner', 'sv', 'Ägare', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678902', 'collectionMembers.member', 'sv', 'Medlem', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678903', 'collectionMembers.changeRole', 'sv', 'Ändra Roll', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678904', 'collectionMembers.removeUser', 'sv', 'Ta bort Användare', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678905', 'collectionMembers.leaveCollection', 'sv', 'Lämna Samling', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678906', 'collectionMembers.routeCount', 'sv', '{count} rutter', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678907', 'collectionMembers.confirmRemove', 'sv', 'Är du säker på att du vill ta bort denna användare?', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678908', 'collectionMembers.confirmLeave', 'sv', 'Är du säker på att du vill lämna denna samling?', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678909', 'roleManagement.title', 'sv', 'Ändra Användarroll', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890a', 'roleManagement.makeOwner', 'sv', 'Gör till Ägare', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890b', 'roleManagement.makeMember', 'sv', 'Gör till Medlem', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890c', 'roleManagement.roleChanged', 'sv', 'Användarroll ändrad framgångsrikt', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890d', 'roleManagement.failedToChange', 'sv', 'Misslyckades att ändra användarroll', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890e', 'collectionActions.share', 'sv', 'Dela', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-234567890f', 'collectionActions.edit', 'sv', 'Redigera', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678910', 'collectionActions.delete', 'sv', 'Ta bort', 'mobile', NOW(), NOW()),
('d1e2f3g4-h5i6-7890-defg-2345678911', 'collectionActions.confirmDelete', 'sv', 'Är du säker på att du vill ta bort denna samling?', 'mobile', NOW(), NOW()),
('f1g2h3i4-j5k6-7890-fghi-4567890123', 'roleManagement.viewer', 'sv', 'Visare', 'mobile', NOW(), NOW()),
('f1g2h3i4-j5k6-7890-fghi-4567890124', 'roleManagement.editor', 'sv', 'Redigerare', 'mobile', NOW(), NOW()),
('f1g2h3i4-j5k6-7890-fghi-4567890125', 'collectionMembers.pendingInvitation', 'sv', 'Väntande Inbjudan', 'mobile', NOW(), NOW()),
('f1g2h3i4-j5k6-7890-fghi-4567890126', 'collectionMembers.cancelInvitation', 'sv', 'Avbryt Inbjudan', 'mobile', NOW(), NOW()),
('f1g2h3i4-j5k6-7890-fghi-4567890127', 'routeCollections.routeCount', 'sv', 'Rutter', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Public Edit Permissions Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('g1h2i3j4-k5l6-7890-ghij-5678901234', 'routeCollections.allowPublicEdit', 'en', 'Allow Public Editing', 'mobile', NOW(), NOW()),
('g1h2i3j4-k5l6-7890-ghij-5678901235', 'routeCollections.allowPublicEditDescription', 'en', 'Allow anyone to add/remove routes from this public collection', 'mobile', NOW(), NOW()),
('g1h2i3j4-k5l6-7890-ghij-5678901236', 'routeCollections.enabled', 'en', 'Enabled', 'mobile', NOW(), NOW()),
('g1h2i3j4-k5l6-7890-ghij-5678901237', 'routeCollections.disabled', 'en', 'Disabled', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Public Edit Permissions Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('h1i2j3k4-l5m6-7890-hijk-6789012345', 'routeCollections.allowPublicEdit', 'sv', 'Tillåt Offentlig Redigering', 'mobile', NOW(), NOW()),
('h1i2j3k4-l5m6-7890-hijk-6789012346', 'routeCollections.allowPublicEditDescription', 'sv', 'Tillåt alla att lägga till/ta bort rutter från denna offentliga samling', 'mobile', NOW(), NOW()),
('h1i2j3k4-l5m6-7890-hijk-6789012347', 'routeCollections.enabled', 'sv', 'Aktiverad', 'mobile', NOW(), NOW()),
('h1i2j3k4-l5m6-7890-hijk-6789012348', 'routeCollections.disabled', 'sv', 'Inaktiverad', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
