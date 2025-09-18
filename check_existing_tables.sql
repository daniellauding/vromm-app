-- Check What Tables Actually Exist
-- Copy and paste this query into your Supabase SQL editor

-- 1. List all tables in your database
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check for any tables with "invitation" in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%invitation%'
   AND table_schema = 'public'
ORDER BY table_name;

-- 3. Check for any tables with "pending" in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%pending%'
   AND table_schema = 'public'
ORDER BY table_name;

-- 4. Check for any tables with "relationship" in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%relationship%'
   AND table_schema = 'public'
ORDER BY table_name;
