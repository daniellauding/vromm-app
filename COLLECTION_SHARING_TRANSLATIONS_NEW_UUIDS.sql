-- Collection Sharing Translations - With Completely New UUIDs
-- This script uses brand new UUIDs to avoid any id conflicts
-- Copy and paste this into your Supabase SQL editor

-- Collection Sharing Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'collectionSharing.title', 'en', 'Share Collection', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'collectionSharing.subtitle', 'en', 'Search for users to share this collection with', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'collectionSharing.searchPlaceholder', 'en', 'Search users by name or email...', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'collectionSharing.sendInvitations', 'en', 'Send Invitations', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'collectionSharing.cancel', 'en', 'Cancel', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'collectionSharing.noUsersFound', 'en', 'No users found', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'collectionSharing.selectedUsers', 'en', 'Selected Users', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'collectionSharing.removeUser', 'en', 'Remove', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'collectionSharing.invitationsSent', 'en', 'Invitations sent successfully', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'collectionSharing.failedToSend', 'en', 'Failed to send invitations', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();

-- Collection Sharing Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'collectionSharing.title', 'sv', 'Dela Samling', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440001', 'collectionSharing.subtitle', 'sv', 'Sök efter användare att dela denna samling med', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', 'collectionSharing.searchPlaceholder', 'sv', 'Sök användare efter namn eller e-post...', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440003', 'collectionSharing.sendInvitations', 'sv', 'Skicka Inbjudningar', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440004', 'collectionSharing.cancel', 'sv', 'Avbryt', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440005', 'collectionSharing.noUsersFound', 'sv', 'Inga användare hittades', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440006', 'collectionSharing.selectedUsers', 'sv', 'Valda Användare', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440007', 'collectionSharing.removeUser', 'sv', 'Ta bort', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440008', 'collectionSharing.invitationsSent', 'sv', 'Inbjudningar skickade framgångsrikt', 'mobile', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440009', 'collectionSharing.failedToSend', 'sv', 'Misslyckades att skicka inbjudningar', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();

-- Collection Members Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('770e8400-e29b-41d4-a716-446655440000', 'collectionMembers.title', 'en', 'Collection Members', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440001', 'collectionMembers.owner', 'en', 'Owner', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440002', 'collectionMembers.member', 'en', 'Member', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440003', 'collectionMembers.changeRole', 'en', 'Change Role', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440004', 'collectionMembers.removeUser', 'en', 'Remove User', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440005', 'collectionMembers.leaveCollection', 'en', 'Leave Collection', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440006', 'collectionMembers.routeCount', 'en', '{count} routes', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440007', 'collectionMembers.confirmRemove', 'en', 'Are you sure you want to remove this user?', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440008', 'collectionMembers.confirmLeave', 'en', 'Are you sure you want to leave this collection?', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440009', 'roleManagement.title', 'en', 'Change User Role', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440010', 'roleManagement.makeOwner', 'en', 'Make Owner', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440011', 'roleManagement.makeMember', 'en', 'Make Member', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440012', 'roleManagement.roleChanged', 'en', 'User role changed successfully', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440013', 'roleManagement.failedToChange', 'en', 'Failed to change user role', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440014', 'collectionActions.share', 'en', 'Share', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440015', 'collectionActions.edit', 'en', 'Edit', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440016', 'collectionActions.delete', 'en', 'Delete', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440017', 'collectionActions.confirmDelete', 'en', 'Are you sure you want to delete this collection?', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440018', 'roleManagement.viewer', 'en', 'Viewer', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440019', 'roleManagement.editor', 'en', 'Editor', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440020', 'collectionMembers.pendingInvitation', 'en', 'Pending Invitation', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440021', 'collectionMembers.cancelInvitation', 'en', 'Cancel Invitation', 'mobile', NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440022', 'routeCollections.routeCount', 'en', 'Routes', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();

-- Collection Members Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('880e8400-e29b-41d4-a716-446655440000', 'collectionMembers.title', 'sv', 'Samlingsmedlemmar', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440001', 'collectionMembers.owner', 'sv', 'Ägare', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440002', 'collectionMembers.member', 'sv', 'Medlem', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440003', 'collectionMembers.changeRole', 'sv', 'Ändra Roll', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440004', 'collectionMembers.removeUser', 'sv', 'Ta bort Användare', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440005', 'collectionMembers.leaveCollection', 'sv', 'Lämna Samling', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440006', 'collectionMembers.routeCount', 'sv', '{count} rutter', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440007', 'collectionMembers.confirmRemove', 'sv', 'Är du säker på att du vill ta bort denna användare?', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440008', 'collectionMembers.confirmLeave', 'sv', 'Är du säker på att du vill lämna denna samling?', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440009', 'roleManagement.title', 'sv', 'Ändra Användarroll', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440010', 'roleManagement.makeOwner', 'sv', 'Gör till Ägare', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440011', 'roleManagement.makeMember', 'sv', 'Gör till Medlem', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440012', 'roleManagement.roleChanged', 'sv', 'Användarroll ändrad framgångsrikt', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440013', 'roleManagement.failedToChange', 'sv', 'Misslyckades att ändra användarroll', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440014', 'collectionActions.share', 'sv', 'Dela', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440015', 'collectionActions.edit', 'sv', 'Redigera', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440016', 'collectionActions.delete', 'sv', 'Ta bort', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440017', 'collectionActions.confirmDelete', 'sv', 'Är du säker på att du vill ta bort denna samling?', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440018', 'roleManagement.viewer', 'sv', 'Visare', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440019', 'roleManagement.editor', 'sv', 'Redigerare', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440020', 'collectionMembers.pendingInvitation', 'sv', 'Väntande Inbjudan', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440021', 'collectionMembers.cancelInvitation', 'sv', 'Avbryt Inbjudan', 'mobile', NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440022', 'routeCollections.routeCount', 'sv', 'Rutter', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();

-- Public Edit Permissions Translations (English)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('990e8400-e29b-41d4-a716-446655440000', 'routeCollections.allowPublicEdit', 'en', 'Allow Public Editing', 'mobile', NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440001', 'routeCollections.allowPublicEditDescription', 'en', 'Allow anyone to add/remove routes from this public collection', 'mobile', NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440002', 'routeCollections.enabled', 'en', 'Enabled', 'mobile', NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440003', 'routeCollections.disabled', 'en', 'Disabled', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();

-- Public Edit Permissions Translations (Swedish)
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440000', 'routeCollections.allowPublicEdit', 'sv', 'Tillåt Offentlig Redigering', 'mobile', NOW(), NOW()),
('aa0e8400-e29b-41d4-a716-446655440001', 'routeCollections.allowPublicEditDescription', 'sv', 'Tillåt alla att lägga till/ta bort rutter från denna offentliga samling', 'mobile', NOW(), NOW()),
('aa0e8400-e29b-41d4-a716-446655440002', 'routeCollections.enabled', 'sv', 'Aktiverad', 'mobile', NOW(), NOW()),
('aa0e8400-e29b-41d4-a716-446655440003', 'routeCollections.disabled', 'sv', 'Inaktiverad', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value, 
  updated_at = NOW();
