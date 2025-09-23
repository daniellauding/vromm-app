-- INVITATION TABLES OVERVIEW - Complete analysis of all invitation-related data
-- This shows all tables, statuses, and invitation types in your system

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

-- Recent pending invitations (last 7 days)
SELECT 
    'Recent Pending Invitations (7 days)' as analysis_type,
    email,
    role,
    status,
    created_at,
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type,
    COALESCE(metadata->>'supervisorName', 'Unknown') as inviter_name
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================================================
-- 3. COLLECTION INVITATIONS - PRESET SHARING
-- ============================================================================
SELECT '=== COLLECTION INVITATIONS (PRESET SHARING) ===' as section;

-- Check if collection_invitations table exists and get stats
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations')
        THEN '✅ collection_invitations table exists'
        ELSE '❌ collection_invitations table MISSING'
    END as collection_table_status;

-- Collection invitations status breakdown (if table exists)
SELECT 
    'Collection Invitations Status' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM collection_invitations 
GROUP BY status
ORDER BY count DESC;

-- Recent collection invitations (if table exists)
SELECT 
    'Recent Collection Invitations (7 days)' as analysis_type,
    email,
    status,
    created_at,
    COALESCE(metadata->>'collectionName', 'Unknown Collection') as collection_name
FROM collection_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

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

-- Recent relationships (last 7 days)
SELECT 
    'Recent Relationships (7 days)' as analysis_type,
    'Student: ' || COALESCE(s.full_name, 'Unknown') as student_info,
    'Supervisor: ' || COALESCE(sup.full_name, 'Unknown') as supervisor_info,
    ssr.status,
    ssr.created_at
FROM student_supervisor_relationships ssr
LEFT JOIN profiles s ON s.id = ssr.student_id
LEFT JOIN profiles sup ON sup.id = ssr.supervisor_id
WHERE ssr.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ssr.created_at DESC;

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

-- Recent notifications (last 7 days)
SELECT 
    'Recent Notifications (7 days)' as analysis_type,
    type,
    title,
    is_read,
    created_at,
    CASE 
        WHEN type IN ('supervisor_invitation', 'student_invitation') THEN '🔗 Relationship invitation'
        WHEN type = 'collection_invitation' THEN '📁 Collection invitation'
        WHEN type = 'follow_new_route' THEN '🗺️ Route following'
        ELSE '❓ Other notification'
    END as notification_category
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================================================
-- 6. COLLECTION/PRESET MEMBERS
-- ============================================================================
SELECT '=== COLLECTION/PRESET MEMBERS ===' as section;

-- Check if map_preset_members table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_preset_members')
        THEN '✅ map_preset_members table exists'
        ELSE '❌ map_preset_members table MISSING'
    END as preset_members_table_status;

-- Collection members breakdown (if table exists)
SELECT 
    'Collection Members' as analysis_type,
    'Total members' as metric,
    COUNT(*) as count
FROM map_preset_members;

-- Recent collection members (if table exists)
SELECT 
    'Recent Collection Members (7 days)' as analysis_type,
    'Collection ID: ' || COALESCE(preset_id::text, 'Unknown') as collection_info,
    'User ID: ' || COALESCE(user_id::text, 'Unknown') as user_info,
    created_at
FROM map_preset_members 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================================================
-- 7. COLLECTIONS/PRESETS
-- ============================================================================
SELECT '=== COLLECTIONS/PRESETS ===' as section;

-- Check if map_presets table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_presets')
        THEN '✅ map_presets table exists'
        ELSE '❌ map_presets table MISSING'
    END as presets_table_status;

-- Collections breakdown (if table exists)
SELECT 
    'Collections/Presets' as analysis_type,
    'Total collections' as metric,
    COUNT(*) as count
FROM map_presets;

-- Recent collections (if table exists)
SELECT 
    'Recent Collections (7 days)' as analysis_type,
    COALESCE(name, 'Unnamed Collection') as collection_name,
    COALESCE(description, 'No description') as description,
    created_at
FROM map_presets 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

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
