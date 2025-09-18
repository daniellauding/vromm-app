-- Unified Invitation Modal Translations
-- Copy and paste these into your Supabase SQL editor

-- English translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440300', 'invitations.newInvitations', 'en', 'New Invitations', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440301', 'invitations.supervisorInvitation', 'en', 'Supervisor Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440302', 'invitations.studentInvitation', 'en', 'Student Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440303', 'invitations.collectionInvitation', 'en', 'Collection Invitation', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440304', 'invitations.supervisorMessage', 'en', 'wants you to be their supervisor', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440305', 'invitations.studentMessage', 'en', 'wants you to be their student', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440306', 'invitations.collectionMessage', 'en', 'invited you to join a collection', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440307', 'invitations.customMessage', 'en', 'Custom Message', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440308', 'invitations.collectionName', 'en', 'Collection', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440309', 'invitations.accept', 'en', 'Accept', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440310', 'invitations.decline', 'en', 'Decline', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440311', 'invitations.dismiss', 'en', 'Dismiss', 'mobile', NOW(), NOW());

-- Swedish translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440312', 'invitations.newInvitations', 'sv', 'Nya Inbjudningar', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440313', 'invitations.supervisorInvitation', 'sv', 'Handledar Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440314', 'invitations.studentInvitation', 'sv', 'Elev Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440315', 'invitations.collectionInvitation', 'sv', 'Samlings Inbjudan', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440316', 'invitations.supervisorMessage', 'sv', 'vill att du ska vara deras handledare', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440317', 'invitations.studentMessage', 'sv', 'vill att du ska vara deras elev', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440318', 'invitations.collectionMessage', 'sv', 'bjuder in dig att gå med i en samling', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440319', 'invitations.customMessage', 'sv', 'Anpassat Meddelande', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440320', 'invitations.collectionName', 'sv', 'Samling', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440321', 'invitations.accept', 'sv', 'Acceptera', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440322', 'invitations.decline', 'sv', 'Avvisa', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440323', 'invitations.dismiss', 'sv', 'Avfärda', 'mobile', NOW(), NOW());
