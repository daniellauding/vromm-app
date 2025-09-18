-- Check what invitations actually exist for daniel+student@lauding.se
-- This will help us understand why the UnifiedInvitationModal isn't showing

-- 1. Check pending_invitations table
SELECT 
    'PENDING_INVITATIONS' as table_name,
    id,
    email,
    role,
    status,
    invited_by,
    created_at,
    metadata
FROM pending_invitations 
WHERE email = 'daniel+student@lauding.se'
ORDER BY created_at DESC;

-- 2. Check collection_invitations table
SELECT 
    'COLLECTION_INVITATIONS' as table_name,
    id,
    preset_id,
    invited_user_id,
    invited_by_user_id,
    role,
    status,
    message,
    created_at
FROM collection_invitations 
WHERE invited_user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY created_at DESC;

-- 3. Check if there are any notifications in the notifications table
SELECT 
    'NOTIFICATIONS' as table_name,
    id,
    user_id,
    type,
    title,
    message,
    data,
    created_at
FROM notifications 
WHERE user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check what tables exist that might contain invitation data
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%invitation%' 
OR table_name LIKE '%notification%'
ORDER BY table_name;
