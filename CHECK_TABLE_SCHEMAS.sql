-- Check Table Schemas
-- Copy and paste these queries into your Supabase SQL editor to see the actual table structures

-- 1. Check pending_invitations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
ORDER BY ordinal_position;

-- 2. Check collection_invitations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'collection_invitations' 
ORDER BY ordinal_position;

-- 3. Check if there are any other invitation-related tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%invitation%' 
   OR table_name LIKE '%pending%'
   OR table_name LIKE '%relationship%'
ORDER BY table_name;