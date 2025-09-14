-- CommunicationTools Translations
-- Swedish and English translations for the CommunicationTools component

-- English Translations
INSERT INTO translations (key, value, language, platform) VALUES
-- Communication Tools General
('home.communication', 'Communication', 'en', 'mobile'),
('communication.messages', 'Messages', 'en', 'mobile'),
('communication.notifications', 'Notifications', 'en', 'mobile'),
('communication.events', 'Events', 'en', 'mobile'),

-- Communication Tools Badges
('communication.newMessages', 'new', 'en', 'mobile'),
('communication.newNotifications', 'new', 'en', 'mobile'),
('communication.newEvents', 'new', 'en', 'mobile'),

-- Communication Tools Actions
('communication.viewMessages', 'View Messages', 'en', 'mobile'),
('communication.viewNotifications', 'View Notifications', 'en', 'mobile'),
('communication.viewEvents', 'View Events', 'en', 'mobile'),

-- Communication Tools Descriptions
('communication.messagesDescription', 'Chat with instructors and students', 'en', 'mobile'),
('communication.notificationsDescription', 'Stay updated with app notifications', 'en', 'mobile'),
('communication.eventsDescription', 'Join driving events and meetups', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
-- Communication Tools General
('home.communication', 'Kommunikation', 'sv', 'mobile'),
('communication.messages', 'Meddelanden', 'sv', 'mobile'),
('communication.notifications', 'Notifieringar', 'sv', 'mobile'),
('communication.events', 'Evenemang', 'sv', 'mobile'),

-- Communication Tools Badges
('communication.newMessages', 'nya', 'sv', 'mobile'),
('communication.newNotifications', 'nya', 'sv', 'mobile'),
('communication.newEvents', 'nya', 'sv', 'mobile'),

-- Communication Tools Actions
('communication.viewMessages', 'Visa meddelanden', 'sv', 'mobile'),
('communication.viewNotifications', 'Visa notifieringar', 'sv', 'mobile'),
('communication.viewEvents', 'Visa evenemang', 'sv', 'mobile'),

-- Communication Tools Descriptions
('communication.messagesDescription', 'Chatta med instruktörer och elever', 'sv', 'mobile'),
('communication.notificationsDescription', 'Håll dig uppdaterad med appnotifieringar', 'sv', 'mobile'),
('communication.eventsDescription', 'Delta i körutbildningsevenemang och träffar', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
