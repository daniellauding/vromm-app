-- Check collections for specific users
-- User IDs: f7898809-c27d-4e81-8051-e049cd68f803, c16a364f-3bc4-4d60-bca9-460e977fddea, 06c73e75-0ef7-442b-acd0-ee204f83d1aa

-- First, let's check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%collection%' 
OR table_name LIKE '%preset%'
OR table_name LIKE '%invitation%'
ORDER BY table_name;

-- Check what columns exist in map_presets table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1. Check collections created by these users (using only basic columns)
SELECT 
    mp.id,
    mp.name,
    mp.creator_id,
    mp.created_at,
    'CREATED_BY' as relationship_type
FROM map_presets mp
WHERE mp.creator_id IN (
    'f7898809-c27d-4e81-8051-e049cd68f803',
    'c16a364f-3bc4-4d60-bca9-460e977fddea', 
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);

-- 2. Check collections these users are members of
SELECT 
    mp.id,
    mp.name,
    mp.creator_id,
    mp.created_at,
    mpm.role,
    'MEMBER_OF' as relationship_type
FROM map_presets mp
JOIN map_preset_members mpm ON mp.id = mpm.preset_id
WHERE mpm.user_id IN (
    'f7898809-c27d-4e81-8051-e049cd68f803',
    'c16a364f-3bc4-4d60-bca9-460e977fddea',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);

-- 3. Check pending invitations for these users (if table exists)
-- Note: This table may not exist yet - run create_collection_invitations_table.sql first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations') THEN
        -- Table exists, run the query
        PERFORM 1; -- This will be replaced by the actual query
    ELSE
        RAISE NOTICE 'collection_invitations table does not exist. Run create_collection_invitations_table.sql first.';
    END IF;
END $$;

-- If the table exists, uncomment and run this query:
/*
SELECT 
    ci.id as invitation_id,
    ci.preset_id,
    mp.name as preset_name,
    ci.invited_user_id,
    ci.role,
    ci.status,
    ci.created_at,
    ci.responded_at
FROM collection_invitations ci
JOIN map_presets mp ON ci.preset_id = mp.id
WHERE ci.invited_user_id IN (
    'f7898809-c27d-4e81-8051-e049cd68f803',
    'c16a364f-3bc4-4d60-bca9-460e977fddea',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);
*/

-- 4. Check all collections with member counts
SELECT 
    mp.id,
    mp.name,
    mp.creator_id,
    COUNT(mpm.user_id) as member_count
FROM map_presets mp
LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id
GROUP BY mp.id, mp.name, mp.creator_id
ORDER BY mp.created_at DESC;

-- 5. Check specific user's collection access
SELECT 
    mp.id,
    mp.name,
    mp.creator_id,
    CASE 
        WHEN mp.creator_id = 'f7898809-c27d-4e81-8051-e049cd68f803' THEN 'CREATOR'
        WHEN mpm.user_id IS NOT NULL THEN 'MEMBER'
        ELSE 'NO_ACCESS'
    END as access_level,
    mpm.role
FROM map_presets mp
LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id AND mpm.user_id = 'f7898809-c27d-4e81-8051-e049cd68f803'
WHERE mp.creator_id = 'f7898809-c27d-4e81-8051-e049cd68f803' 
   OR mpm.user_id = 'f7898809-c27d-4e81-8051-e049cd68f803'
ORDER BY mp.created_at DESC;
