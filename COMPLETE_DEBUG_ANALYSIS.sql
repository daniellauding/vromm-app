-- COMPLETE DEBUG ANALYSIS - Comprehensive invitation system debugging
-- This will give you a complete picture of your invitation system

-- ============================================================================
-- 1. SYSTEM OVERVIEW
-- ============================================================================
SELECT '=== SYSTEM OVERVIEW ===' as section;

-- Table existence and row counts
SELECT 
    'Table Status' as check_type,
    'pending_invitations' as table_name,
    COUNT(*) as row_count,
    'Relationship invitations' as purpose
FROM pending_invitations

UNION ALL

SELECT 
    'Table Status' as check_type,
    'student_supervisor_relationships' as table_name,
    COUNT(*) as row_count,
    'Active relationships' as purpose
FROM student_supervisor_relationships

UNION ALL

SELECT 
    'Table Status' as check_type,
    'notifications' as table_name,
    COUNT(*) as row_count,
    'All notifications' as purpose
FROM notifications

UNION ALL

SELECT 
    'Table Status' as check_type,
    'collection_invitations' as table_name,
    COUNT(*) as row_count,
    'Collection invitations' as purpose
FROM collection_invitations;

-- ============================================================================
-- 2. PENDING INVITATIONS DETAILED ANALYSIS
-- ============================================================================
SELECT '=== PENDING INVITATIONS ANALYSIS ===' as section;

-- Status breakdown
SELECT 
    'Status Breakdown' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY status
ORDER BY count DESC;

-- Role breakdown
SELECT 
    'Role Breakdown' as analysis_type,
    role,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY role
ORDER BY count DESC;

-- Relationship type breakdown
SELECT 
    'Relationship Type Breakdown' as analysis_type,
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM pending_invitations 
GROUP BY metadata->>'relationshipType'
ORDER BY count DESC;

-- Recent activity (last 7 days)
SELECT 
    'Recent Activity (7 days)' as analysis_type,
    'New invitations' as activity,
    COUNT(*) as count
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Recent Activity (7 days)' as analysis_type,
    'Accepted invitations' as activity,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'accepted' AND accepted_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Recent Activity (7 days)' as analysis_type,
    'Declined invitations' as activity,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'declined' AND updated_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 3. RELATIONSHIPS ANALYSIS
-- ============================================================================
SELECT '=== RELATIONSHIPS ANALYSIS ===' as section;

-- Relationship status breakdown
SELECT 
    'Relationship Status' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM student_supervisor_relationships 
GROUP BY status
ORDER BY count DESC;

-- Recent relationships (last 7 days)
SELECT 
    'Recent Relationships (7 days)' as analysis_type,
    'New relationships' as activity,
    COUNT(*) as count
FROM student_supervisor_relationships 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 4. NOTIFICATIONS ANALYSIS
-- ============================================================================
SELECT '=== NOTIFICATIONS ANALYSIS ===' as section;

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
    'New notifications' as activity,
    COUNT(*) as count
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Recent Notifications (7 days)' as analysis_type,
    'Unread notifications' as activity,
    COUNT(*) as count
FROM notifications 
WHERE is_read = false AND created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 5. DATA INTEGRITY CHECKS
-- ============================================================================
SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned invitations
SELECT 
    'Data Integrity' as check_type,
    'Orphaned invitations (no target user)' as issue,
    COUNT(*) as count
FROM pending_invitations pi
LEFT JOIN profiles p ON p.email = pi.email
WHERE p.id IS NULL

UNION ALL

-- Check for invitations without metadata
SELECT 
    'Data Integrity' as check_type,
    'Invitations without relationshipType' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE metadata->>'relationshipType' IS NULL

UNION ALL

-- Check for accepted invitations without accepted_by
SELECT 
    'Data Integrity' as check_type,
    'Accepted invitations without accepted_by' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'accepted' AND accepted_by IS NULL

UNION ALL

-- Check for expired invitations
SELECT 
    'Data Integrity' as check_type,
    'Expired pending invitations' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND expires_at < NOW()

UNION ALL

-- Check for old pending invitations
SELECT 
    'Data Integrity' as check_type,
    'Pending invitations older than 30 days' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- 6. CONVERSION ANALYSIS
-- ============================================================================
SELECT '=== CONVERSION ANALYSIS ===' as section;

-- Invitation to relationship conversion
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
    END as acceptance_rate_percent,
    CASE 
        WHEN i.accepted_invitations > r.total_relationships 
        THEN '❌ More accepted invitations than relationships'
        WHEN i.accepted_invitations = r.total_relationships 
        THEN '✅ Invitations match relationships'
        ELSE '⚠️ More relationships than accepted invitations'
    END as conversion_status
FROM invitation_stats i, relationship_stats r;

-- ============================================================================
-- 7. RECENT ACTIVITY TIMELINE
-- ============================================================================
SELECT '=== RECENT ACTIVITY TIMELINE ===' as section;

-- Last 10 pending invitations
SELECT 
    'Recent Pending Invitations' as activity_type,
    email,
    role,
    status,
    created_at,
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type
FROM pending_invitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Last 10 relationships
SELECT 
    'Recent Relationships' as activity_type,
    'Student: ' || COALESCE(s.full_name, 'Unknown') as student_info,
    'Supervisor: ' || COALESCE(sup.full_name, 'Unknown') as supervisor_info,
    ssr.status,
    ssr.created_at
FROM student_supervisor_relationships ssr
LEFT JOIN profiles s ON s.id = ssr.student_id
LEFT JOIN profiles sup ON sup.id = ssr.supervisor_id
ORDER BY ssr.created_at DESC 
LIMIT 10;

-- Last 10 notifications
SELECT 
    'Recent Notifications' as activity_type,
    type,
    title,
    is_read,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
