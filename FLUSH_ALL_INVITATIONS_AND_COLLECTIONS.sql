-- FLUSH ALL INVITATIONS AND COLLECTIONS - START FRESH

-- 1. Delete all notifications
DELETE FROM notifications;

-- 2. Delete all pending invitations
DELETE FROM pending_invitations;

-- 3. Delete all collection invitations
DELETE FROM collection_invitations;

-- 4. Delete all map preset members
DELETE FROM map_preset_members;

-- 5. Delete all map presets (collections)
DELETE FROM map_presets;

-- 6. Delete all relationships
DELETE FROM student_supervisor_relationships;
DELETE FROM supervisor_student_relationships;

-- 7. Verify everything is clean
SELECT 'Verification - should all be empty:' as info;

SELECT 'Notifications count:' as table_name, COUNT(*) as count FROM notifications
UNION ALL
SELECT 'Pending invitations count:', COUNT(*) FROM pending_invitations
UNION ALL
SELECT 'Collection invitations count:', COUNT(*) FROM collection_invitations
UNION ALL
SELECT 'Map preset members count:', COUNT(*) FROM map_preset_members
UNION ALL
SELECT 'Map presets count:', COUNT(*) FROM map_presets
UNION ALL
SELECT 'Student supervisor relationships count:', COUNT(*) FROM student_supervisor_relationships
UNION ALL
SELECT 'Supervisor student relationships count:', COUNT(*) FROM supervisor_student_relationships;

-- 8. Create a test collection for testing
INSERT INTO map_presets (id, name, description, creator_id, visibility)
VALUES (
    gen_random_uuid(),
    'Test Collection',
    'A test collection for invitation testing',
    '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',
    'private'
);

SELECT 'Created test collection:' as info;
SELECT id, name, created_at FROM map_presets;
