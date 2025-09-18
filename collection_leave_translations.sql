-- Collection Leave Modal Translations
-- Copy and paste these into your Supabase SQL editor

-- English translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'routeCollections.leaveCollection', 'en', 'Leave Collection', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440101', 'routeCollections.yourRole', 'en', 'Your role:', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440102', 'routeCollections.warning', 'en', 'Warning', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440103', 'routeCollections.leaveWarning', 'en', 'You will lose access to this collection and all its routes. This action cannot be undone.', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440104', 'routeCollections.optionalMessage', 'en', 'Optional Message', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440105', 'routeCollections.leaveMessageDescription', 'en', 'Let the collection owner know why you are leaving (optional)', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440106', 'routeCollections.leaveMessagePlaceholder', 'en', 'Enter your message here...', 'mobile', NOW(), NOW());

-- Swedish translations
INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440107', 'routeCollections.leaveCollection', 'sv', 'Lämna Samling', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440108', 'routeCollections.yourRole', 'sv', 'Din roll:', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440109', 'routeCollections.warning', 'sv', 'Varning', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440110', 'routeCollections.leaveWarning', 'sv', 'Du kommer att förlora åtkomst till denna samling och alla dess rutter. Denna åtgärd kan inte ångras.', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440111', 'routeCollections.optionalMessage', 'sv', 'Valfritt Meddelande', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440112', 'routeCollections.leaveMessageDescription', 'sv', 'Låt samlingsägaren veta varför du lämnar (valfritt)', 'mobile', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440113', 'routeCollections.leaveMessagePlaceholder', 'sv', 'Skriv ditt meddelande här...', 'mobile', NOW(), NOW());
