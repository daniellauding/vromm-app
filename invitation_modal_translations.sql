-- Invitation Modal Translations
-- Copy and paste these into your Supabase SQL editor

-- English translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440200', 'invitations.newInvitations', 'en', 'New Invitations', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440201', 'invitations.supervisorInvitation', 'en', 'Supervisor Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440202', 'invitations.studentInvitation', 'en', 'Student Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440203', 'invitations.collectionInvitation', 'en', 'Collection Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440204', 'invitations.supervisorMessage', 'en', 'wants you to be their supervisor', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440205', 'invitations.studentMessage', 'en', 'wants you to be their student', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440206', 'invitations.collectionMessage', 'en', 'wants to share a collection with you', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440207', 'invitations.personalMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440208', 'invitations.accepted', 'en', 'Invitation Accepted', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440209', 'invitations.relationshipAccepted', 'en', 'You are now connected!', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440210', 'invitations.collectionAccepted', 'en', 'You now have access to this collection!', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440211', 'invitations.acceptError', 'en', 'Failed to accept invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440212', 'invitations.declineError', 'en', 'Failed to decline invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440213', 'invitations.dismissAll', 'en', 'Dismiss All', 'mobile', NOW(), NOW());

-- Swedish translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440214', 'invitations.newInvitations', 'sv', 'Nya Inbjudningar', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440215', 'invitations.supervisorInvitation', 'sv', 'Handledar Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440216', 'invitations.studentInvitation', 'sv', 'Elev Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440217', 'invitations.collectionInvitation', 'sv', 'Samlings Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440218', 'invitations.supervisorMessage', 'sv', 'vill att du ska vara deras handledare', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440219', 'invitations.studentMessage', 'sv', 'vill att du ska vara deras elev', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440220', 'invitations.collectionMessage', 'sv', 'vill dela en samling med dig', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440221', 'invitations.personalMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440222', 'invitations.accepted', 'sv', 'Inbjudan Accepterad', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440223', 'invitations.relationshipAccepted', 'sv', 'Ni är nu kopplade!', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440224', 'invitations.collectionAccepted', 'sv', 'Du har nu tillgång till denna samling!', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440225', 'invitations.acceptError', 'sv', 'Misslyckades att acceptera inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440226', 'invitations.declineError', 'sv', 'Misslyckades att avslå inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440227', 'invitations.dismissAll', 'sv', 'Avfärda Alla', 'mobile', NOW(), NOW());
