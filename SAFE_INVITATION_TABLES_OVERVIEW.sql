-- SAFE INVITATION TABLES OVERVIEW - Uses wildcards to avoid column errors
-- This shows all tables, statuses, and invitation types safely

-- ============================================================================
-- 1. ALL INVITATION-RELATED TABLES EXISTENCE
-- ============================================================================
SELECT '=== TABLE EXISTENCE CHECK ===' as section;

SELECT 
    'Table Existence' as check_type,
    table_name,
    CASE 
        WHEN table_name = 'pending_invitations' THEN '🔗 Relationship invitations (student/instructor)'
        WHEN table_name = 'collection_invitations' THEN '📁 Collection/preset sharing invitations'
        WHEN table_name = 'notifications' THEN '🔔 All notification types'
        WHEN table_name = 'student_supervisor_relationships' THEN '👥 Active relationships'
        WHEN table_name = 'map_preset_members' THEN '📋 Collection members'
        WHEN table_name = 'map_presets' THEN '🗺️ Collections/presets'
        ELSE '📊 Other table'
    END as table_purpose,
    'Check if exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'pending_invitations', 
        'collection_invitations', 
        'notifications', 
        'student_supervisor_relationships', 
        'map_preset_members',
        'map_presets'
    )
ORDER BY table_name;

-- ============================================================================
-- 2. PENDING INVITATIONS - RELATIONSHIP INVITATIONS
-- ============================================================================
SELECT '=== PENDING INVITATIONS (RELATIONSHIP) ===' as section;

-- Status breakdown
SELECT 
    'Pending Invitations Status' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY status
ORDER BY count DESC;

-- Role breakdown (student/instructor)
SELECT 
    'Pending Invitations Role' as analysis_type,
    role,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY role
ORDER BY count DESC;

-- Relationship type breakdown
SELECT 
    'Pending Invitations Relationship Type' as analysis_type,
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY metadata->>'relationshipType'
ORDER BY count DESC;

-- Recent pending invitations (last 7 days) - show all columns
SELECT 
    'Recent Pending Invitations (7 days)' as analysis_type,
    *
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 3. COLLECTION INVITATIONS - PRESET SHARING (SAFE VERSION)
-- ============================================================================
SELECT '=== COLLECTION INVITATIONS (PRESET SHARING) ===' as section;

-- Check if collection_invitations table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations')
        THEN '✅ collection_invitations table exists'
        ELSE '❌ collection_invitations table MISSING'
    END as collection_table_status;

-- Show all columns in collection_invitations table (if exists)
SELECT 
    'Collection Invitations Columns' as analysis_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'collection_invitations' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data from collection_invitations (if exists) - using wildcard
SELECT 
    'Collection Invitations Sample Data' as analysis_type,
    *
FROM collection_invitations 
LIMIT 3;

-- ============================================================================
-- 4. ACTIVE RELATIONSHIPS
-- ============================================================================
SELECT '=== ACTIVE RELATIONSHIPS ===' as section;

-- Relationship status breakdown
SELECT 
    'Active Relationships Status' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM student_supervisor_relationships 
GROUP BY status
ORDER BY count DESC;

-- Recent relationships (last 7 days) - show all columns
SELECT 
    'Recent Relationships (7 days)' as analysis_type,
    *
FROM student_supervisor_relationships 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 5. NOTIFICATIONS - ALL TYPES
-- ============================================================================
SELECT '=== NOTIFICATIONS - ALL TYPES ===' as section;

-- Notification types breakdown
SELECT 
    'Notification Types' as analysis_type,
    type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
    ROUND(COUNT(CASE WHEN is_read = false THEN 1 END) * 100.0 / COUNT(*), 2) as unread_percentage
FROM notifications 
GROUP BY type
ORDER BY total_count DESC;

-- Recent notifications (last 7 days) - show all columns
SELECT 
    'Recent Notifications (7 days)' as analysis_type,
    *
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 6. COLLECTION/PRESET MEMBERS (SAFE VERSION)
-- ============================================================================
SELECT '=== COLLECTION/PRESET MEMBERS ===' as section;

-- Check if map_preset_members table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_members')
        THEN '✅ map_preset_members table exists'
        ELSE '❌ map_preset_members table MISSING'
    END as preset_members_table_status;

-- Show all columns in map_preset_members table (if exists)
SELECT 
    'Preset Members Columns' as analysis_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'map_preset_members' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data from map_preset_members (if exists) - using wildcard
SELECT 
    'Preset Members Sample Data' as analysis_type,
    *
FROM map_preset_members 
LIMIT 3;

-- ============================================================================
-- 7. COLLECTIONS/PRESETS (SAFE VERSION)
-- ============================================================================
SELECT '=== COLLECTIONS/PRESETS ===' as section;

-- Check if map_presets table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_presets')
        THEN '✅ map_presets table exists'
        ELSE '❌ map_presets table MISSING'
    END as presets_table_status;

-- Show all columns in map_presets table (if exists)
SELECT 
    'Presets Columns' as analysis_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'map_presets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data from map_presets (if exists) - using wildcard
SELECT 
    'Presets Sample Data' as analysis_type,
    *
FROM map_presets 
LIMIT 3;

-- ============================================================================
-- 8. INVITATION FLOW ANALYSIS
-- ============================================================================
SELECT '=== INVITATION FLOW ANALYSIS ===' as section;

-- Pending invitations by relationship type and status
SELECT 
    'Invitation Flow' as analysis_type,
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type,
    role,
    status,
    COUNT(*) as count
FROM pending_invitations 
GROUP BY metadata->>'relationshipType', role, status
ORDER BY relationship_type, role, status;

-- Conversion rate analysis
WITH invitation_stats AS (
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invitations,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_invitations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invitations
    FROM pending_invitations
),
relationship_stats AS (
    SELECT COUNT(*) as total_relationships
    FROM student_supervisor_relationships
    WHERE status = 'active'
)
SELECT 
    'Conversion Analysis' as analysis_type,
    i.total_invitations as total_invitations,
    i.accepted_invitations as accepted_invitations,
    i.declined_invitations as declined_invitations,
    i.pending_invitations as pending_invitations,
    r.total_relationships as active_relationships,
    CASE 
        WHEN i.total_invitations > 0 
        THEN ROUND((i.accepted_invitations::decimal / i.total_invitations) * 100, 2)
        ELSE 0 
    END as acceptance_rate_percent
FROM invitation_stats i, relationship_stats r;

-- ============================================================================
-- 9. DATA INTEGRITY ISSUES
-- ============================================================================
SELECT '=== DATA INTEGRITY ISSUES ===' as section;

-- Check for data integrity issues
SELECT 
    'Data Integrity' as check_type,
    'Accepted invitations without accepted_by' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'accepted' AND accepted_by IS NULL

UNION ALL

SELECT 
    'Data Integrity' as check_type,
    'Pending invitations older than 30 days' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'Data Integrity' as check_type,
    'Invitations without relationshipType metadata' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE metadata->>'relationshipType' IS NULL

UNION ALL

SELECT 
    'Data Integrity' as check_type,
    'Expired pending invitations' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND expires_at < NOW();

-- ============================================================================
-- 10. ALL TABLE SCHEMAS (SAFE VERSION)
-- ============================================================================
SELECT '=== ALL TABLE SCHEMAS ===' as section;

-- Show all columns for all invitation-related tables
SELECT 
    'Table Schema' as analysis_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'pending_invitations', 
        'collection_invitations', 
        'notifications', 
        'student_supervisor_relationships', 
        'map_preset_members',
        'map_presets'
    )
ORDER BY table_name, ordinal_position;
