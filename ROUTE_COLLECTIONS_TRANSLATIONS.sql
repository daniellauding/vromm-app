-- Route Collections Translations (replacing "presets" with "collections")
INSERT INTO translations (key, value, language, platform) VALUES
-- English translations
('routeCollections.addToCollection', 'Add to Collection', 'en', 'mobile'),
('routeCollections.name', 'Collection Name', 'en', 'mobile'),
('routeCollections.namePlaceholder', 'Enter collection name...', 'en', 'mobile'),
('routeCollections.description', 'Description (Optional)', 'en', 'mobile'),
('routeCollections.descriptionPlaceholder', 'Enter description...', 'en', 'mobile'),
('routeCollections.visibility', 'Visibility', 'en', 'mobile'),
('routeCollections.private', 'Private', 'en', 'mobile'),
('routeCollections.public', 'Public', 'en', 'mobile'),
('routeCollections.shared', 'Shared', 'en', 'mobile'),
('routeCollections.allRoutes', 'All Routes', 'en', 'mobile'),
('routeCollections.allRoutesDescription', 'View all available routes', 'en', 'mobile'),
('routeCollections.routes', 'routes', 'en', 'mobile'),
('routeCollections.default', 'Default', 'en', 'mobile'),
('routeCollections.createFirstCollection', 'Create your first custom collection', 'en', 'mobile'),
('routeCollections.createFirstCollectionDescription', 'Organize your routes by creating custom collections like "Summer Routes" or "City Driving".', 'en', 'mobile'),
('routeCollections.createNew', 'Create New', 'en', 'mobile'),
('routeCollections.virtualCollection', 'Virtual Collection', 'en', 'mobile'),
('routeCollections.virtualCollectionMessage', 'This is a virtual collection that shows all routes. You cannot add or remove routes from it.', 'en', 'mobile'),

-- Swedish translations
('routeCollections.addToCollection', 'Lägg till i samling', 'sv', 'mobile'),
('routeCollections.name', 'Samlingsnamn', 'sv', 'mobile'),
('routeCollections.namePlaceholder', 'Ange samlingsnamn...', 'sv', 'mobile'),
('routeCollections.description', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
('routeCollections.descriptionPlaceholder', 'Ange beskrivning...', 'sv', 'mobile'),
('routeCollections.visibility', 'Synlighet', 'sv', 'mobile'),
('routeCollections.private', 'Privat', 'sv', 'mobile'),
('routeCollections.public', 'Offentlig', 'sv', 'mobile'),
('routeCollections.shared', 'Delad', 'sv', 'mobile'),
('routeCollections.allRoutes', 'Alla rutter', 'sv', 'mobile'),
('routeCollections.allRoutesDescription', 'Visa alla tillgängliga rutter', 'sv', 'mobile'),
('routeCollections.routes', 'rutter', 'sv', 'mobile'),
('routeCollections.default', 'Standard', 'sv', 'mobile'),
('routeCollections.createFirstCollection', 'Skapa din första anpassade samling', 'sv', 'mobile'),
('routeCollections.createFirstCollectionDescription', 'Organisera dina rutter genom att skapa anpassade samlingar som "Sommarutflykter" eller "Stadskörning".', 'sv', 'mobile'),
('routeCollections.createNew', 'Skapa ny', 'sv', 'mobile'),
('routeCollections.virtualCollection', 'Virtuell samling', 'sv', 'mobile'),
('routeCollections.virtualCollectionMessage', 'Detta är en virtuell samling som visar alla rutter. Du kan inte lägga till eller ta bort rutter från den.', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
