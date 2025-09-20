-- CHECK PENDING_INVITATIONS TABLE SCHEMA

-- 1. Check the structure of pending_invitations table
SELECT 'Pending invitations table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what's actually in pending_invitations table
SELECT 'Pending invitations data:' as info;
SELECT *
FROM pending_invitations 
WHERE invited_by = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY created_at DESC
LIMIT 10;
