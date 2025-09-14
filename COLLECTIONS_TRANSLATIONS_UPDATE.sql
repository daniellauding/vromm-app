-- Collections Terminology Update
-- This script updates all "Presets" terminology to "Collections" terminology
-- Run this after the UI updates to ensure translations match the new terminology

-- English Translations
INSERT INTO translations (key, value, language, platform) VALUES
-- Route Collections - Main terminology
('routeCollections.title', 'Collections', 'en', 'mobile'),
('routeCollections.myCollections', 'My Collections', 'en', 'mobile'),
('routeCollections.createNew', 'Create New', 'en', 'mobile'),
('routeCollections.manage', 'Manage Collections', 'en', 'mobile'),
('routeCollections.selectCollection', 'Select Collection', 'en', 'mobile'),
('routeCollections.selectedCollection', 'Selected Collection', 'en', 'mobile'),
('routeCollections.tapToChange', 'Tap to change', 'en', 'mobile'),

-- Route Collections - Creation and management
('routeCollections.name', 'Collection Name', 'en', 'mobile'),
('routeCollections.namePlaceholder', 'Enter collection name...', 'en', 'mobile'),
('routeCollections.description', 'Description (Optional)', 'en', 'mobile'),
('routeCollections.descriptionPlaceholder', 'Enter description...', 'en', 'mobile'),
('routeCollections.visibility', 'Visibility', 'en', 'mobile'),
('routeCollections.private', 'Private', 'en', 'mobile'),
('routeCollections.public', 'Public', 'en', 'mobile'),
('routeCollections.shared', 'Shared', 'en', 'mobile'),
('routeCollections.default', 'Default', 'en', 'mobile'),
('routeCollections.routes', 'routes', 'en', 'mobile'),

-- Route Collections - All Routes (virtual collection)
('routeCollections.allRoutes', 'All Routes', 'en', 'mobile'),
('routeCollections.allRoutesDescription', 'View all available routes', 'en', 'mobile'),

-- Route Collections - Empty states and help text
('routeCollections.noCollections', 'No custom collections yet', 'en', 'mobile'),
('routeCollections.createFirst', 'Create your first collection to organize routes', 'en', 'mobile'),
('routeCollections.createFirstCollection', 'Create your first custom collection', 'en', 'mobile'),
('routeCollections.createFirstCollectionDescription', 'Organize your routes by creating custom collections like "Summer Routes" or "City Driving".', 'en', 'mobile'),
('routeCollections.viewAll', 'View All Collections', 'en', 'mobile'),

-- Route Collections - Add to collection functionality
('routeCollections.addToCollection', 'Add to Collection', 'en', 'mobile'),
('routeCollections.virtualCollection', 'Virtual Collection', 'en', 'mobile'),
('routeCollections.virtualCollectionMessage', 'This is a virtual collection that shows all routes. You cannot add or remove routes from it.', 'en', 'mobile'),

-- Route Detail - Add to Collection
('routeDetail.addToCollection', 'Add to Collection', 'en', 'mobile'),
('routeDetail.addedToCollection', 'Added to Collection', 'en', 'mobile'),
('routeDetail.removedFromCollection', 'Removed from Collection', 'en', 'mobile'),
('routeDetail.collectionCreated', 'Collection Created', 'en', 'mobile'),
('routeDetail.routeHasBeenAdded', 'Route has been added to "{collectionName}"', 'en', 'mobile'),
('routeDetail.routeHasBeenRemoved', 'Route has been removed from "{collectionName}"', 'en', 'mobile'),
('routeDetail.newCollectionCreated', 'New collection "{collectionName}" has been created and route added to it', 'en', 'mobile'),

-- Create Route - Save to Collection
('createRoute.saveToCollection', 'Save to Collection', 'en', 'mobile'),
('createRoute.selectCollection', 'Select Collection (Optional)', 'en', 'mobile'),
('createRoute.createNewCollection', 'Create New Collection', 'en', 'mobile'),
('createRoute.collectionSaved', 'Route saved to collection', 'en', 'mobile'),
('createRoute.collectionSelected', 'Collection Selected', 'en', 'mobile'),
('createRoute.routeWillBeSavedTo', 'Route will be saved to "{collectionName}"', 'en', 'mobile'),
('createRoute.collectionCreated', 'Collection Created', 'en', 'mobile'),
('createRoute.newCollectionCreated', 'New collection "{collectionName}" has been created', 'en', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Swedish Translations
INSERT INTO translations (key, value, language, platform) VALUES
-- Route Collections - Main terminology
('routeCollections.title', 'Samlingar', 'sv', 'mobile'),
('routeCollections.myCollections', 'Mina Samlingar', 'sv', 'mobile'),
('routeCollections.createNew', 'Skapa Ny', 'sv', 'mobile'),
('routeCollections.manage', 'Hantera Samlingar', 'sv', 'mobile'),
('routeCollections.selectCollection', 'Välj Samling', 'sv', 'mobile'),
('routeCollections.selectedCollection', 'Vald Samling', 'sv', 'mobile'),
('routeCollections.tapToChange', 'Tryck för att ändra', 'sv', 'mobile'),

-- Route Collections - Creation and management
('routeCollections.name', 'Samlingsnamn', 'sv', 'mobile'),
('routeCollections.namePlaceholder', 'Ange samlingsnamn...', 'sv', 'mobile'),
('routeCollections.description', 'Beskrivning (Valfritt)', 'sv', 'mobile'),
('routeCollections.descriptionPlaceholder', 'Ange beskrivning...', 'sv', 'mobile'),
('routeCollections.visibility', 'Synlighet', 'sv', 'mobile'),
('routeCollections.private', 'Privat', 'sv', 'mobile'),
('routeCollections.public', 'Offentlig', 'sv', 'mobile'),
('routeCollections.shared', 'Delad', 'sv', 'mobile'),
('routeCollections.default', 'Standard', 'sv', 'mobile'),
('routeCollections.routes', 'rutter', 'sv', 'mobile'),

-- Route Collections - All Routes (virtual collection)
('routeCollections.allRoutes', 'Alla Rutter', 'sv', 'mobile'),
('routeCollections.allRoutesDescription', 'Visa alla tillgängliga rutter', 'sv', 'mobile'),

-- Route Collections - Empty states and help text
('routeCollections.noCollections', 'Inga anpassade samlingar än', 'sv', 'mobile'),
('routeCollections.createFirst', 'Skapa din första samling för att organisera rutter', 'sv', 'mobile'),
('routeCollections.createFirstCollection', 'Skapa din första anpassade samling', 'sv', 'mobile'),
('routeCollections.createFirstCollectionDescription', 'Organisera dina rutter genom att skapa anpassade samlingar som "Sommarutflykter" eller "Stadskörning".', 'sv', 'mobile'),
('routeCollections.viewAll', 'Visa Alla Samlingar', 'sv', 'mobile'),

-- Route Collections - Add to collection functionality
('routeCollections.addToCollection', 'Lägg till i Samling', 'sv', 'mobile'),
('routeCollections.virtualCollection', 'Virtuell Samling', 'sv', 'mobile'),
('routeCollections.virtualCollectionMessage', 'Detta är en virtuell samling som visar alla rutter. Du kan inte lägga till eller ta bort rutter från den.', 'sv', 'mobile'),

-- Route Detail - Add to Collection
('routeDetail.addToCollection', 'Lägg till i Samling', 'sv', 'mobile'),
('routeDetail.addedToCollection', 'Tillagd i Samling', 'sv', 'mobile'),
('routeDetail.removedFromCollection', 'Borttagen från Samling', 'sv', 'mobile'),
('routeDetail.collectionCreated', 'Samling Skapad', 'sv', 'mobile'),
('routeDetail.routeHasBeenAdded', 'Rutt har lagts till i "{collectionName}"', 'sv', 'mobile'),
('routeDetail.routeHasBeenRemoved', 'Rutt har tagits bort från "{collectionName}"', 'sv', 'mobile'),
('routeDetail.newCollectionCreated', 'Ny samling "{collectionName}" har skapats och rutt lagts till i den', 'sv', 'mobile'),

-- Create Route - Save to Collection
('createRoute.saveToCollection', 'Spara i Samling', 'sv', 'mobile'),
('createRoute.selectCollection', 'Välj Samling (Valfritt)', 'sv', 'mobile'),
('createRoute.createNewCollection', 'Skapa Ny Samling', 'sv', 'mobile'),
('createRoute.collectionSaved', 'Rutt sparad i samling', 'sv', 'mobile'),
('createRoute.collectionSelected', 'Samling Vald', 'sv', 'mobile'),
('createRoute.routeWillBeSavedTo', 'Rutt kommer att sparas i "{collectionName}"', 'sv', 'mobile'),
('createRoute.collectionCreated', 'Samling Skapad', 'sv', 'mobile'),
('createRoute.newCollectionCreated', 'Ny samling "{collectionName}" har skapats', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
