-- Collection Role Selection Translations for Swedish and English
-- Run this in Supabase CLI SQL Editor

INSERT INTO translations (id, key, language, value, platform, created_at, updated_at) VALUES
-- Role Selection Keys
(gen_random_uuid(), 'routeCollections.selectRole', 'sv', 'Välj roll', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.selectRole', 'en', 'Select role', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleViewer', 'sv', 'Läsare', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleViewer', 'en', 'Viewer', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleEditor', 'sv', 'Redigerare', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleEditor', 'en', 'Editor', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleViewerDescription', 'sv', 'Kan bara visa samlingen', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleViewerDescription', 'en', 'Can only view the collection', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleEditorDescription', 'sv', 'Kan redigera och lägga till rutter', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.roleEditorDescription', 'en', 'Can edit and add routes', 'mobile', now(), now()),

-- Additional Collection Keys
(gen_random_uuid(), 'routeCollections.createFirstCollection', 'sv', 'Skapa din första anpassade samling', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.createFirstCollection', 'en', 'Create your first custom collection', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.createFirstCollectionDescription', 'sv', 'Organisera dina rutter genom att skapa anpassade samlingar som "Sommar rutter" eller "Stadskörning".', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.createFirstCollectionDescription', 'en', 'Organize your routes by creating custom collections like "Summer Routes" or "City Driving".', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionSelected', 'sv', 'Samling vald', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionSelected', 'en', 'Collection selected', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionSelectedMessage', 'sv', 'Vald "{collectionName}"', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionSelectedMessage', 'en', 'Selected "{collectionName}"', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionRemoved', 'sv', 'Samling borttagen', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionRemoved', 'en', 'Collection removed', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionRemovedMessage', 'sv', 'Borttagen från "{collectionName}"', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.collectionRemovedMessage', 'en', 'Removed from "{collectionName}"', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.newCollectionCreated', 'sv', 'Ny samling "{collectionName}" har skapats', 'mobile', now(), now()),
(gen_random_uuid(), 'routeCollections.newCollectionCreated', 'en', 'New collection "{collectionName}" has been created', 'mobile', now(), now());
