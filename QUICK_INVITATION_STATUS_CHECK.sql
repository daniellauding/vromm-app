-- QUICK INVITATION STATUS CHECK
-- Run this to get a quick overview of the current invitation system state

-- ============================================================================
-- 1. TABLE EXISTENCE CHECK
-- ============================================================================
SELECT 
    'Table Existence Check' as check_type,
    table_name,
    CASE 
        WHEN table_name = 'pending_invitations' THEN '🔗 Relationship invitations'
        WHEN table_name = 'collection_invitations' THEN '📁 Collection invitations'
        WHEN table_name = 'notifications' THEN '🔔 Notifications'
        WHEN table_name = 'student_supervisor_relationships' THEN '👥 Relationships'
        WHEN table_name = 'map_preset_members' THEN '📋 Collection members'
        ELSE '📊 Other table'
    END as table_purpose
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'pending_invitations', 
        'collection_invitations', 
        'notifications', 
        'student_supervisor_relationships', 
        'map_preset_members'
    )
ORDER BY table_name;

-- ============================================================================
-- 2. PENDING INVITATIONS QUICK STATS
-- ============================================================================
SELECT 
    'Pending Invitations Summary' as check_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM pending_invitations;

-- ============================================================================
-- 3. RELATIONSHIPS QUICK STATS
-- ============================================================================
SELECT 
    'Active Relationships Summary' as check_type,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM student_supervisor_relationships;

-- ============================================================================
-- 4. NOTIFICATIONS QUICK STATS
-- ============================================================================
SELECT 
    'Notifications Summary' as check_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
    COUNT(CASE WHEN type IN ('supervisor_invitation', 'student_invitation') THEN 1 END) as relationship_invites,
    COUNT(CASE WHEN type = 'collection_invitation' THEN 1 END) as collection_invites,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM notifications;

-- ============================================================================
-- 5. COLLECTION INVITATIONS CHECK
-- ============================================================================
-- Check if collection_invitations table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations') THEN
        RAISE NOTICE 'Collection Invitations Table: EXISTS';
    ELSE
        RAISE NOTICE 'Collection Invitations Table: MISSING - Collection sharing not available';
    END IF;
END $$;

-- Collection invitations summary (if table exists)
SELECT 
    'Collection Invitations Summary' as check_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
FROM collection_invitations;

-- ============================================================================
-- 6. RECENT ACTIVITY (Last 24 hours)
-- ============================================================================
SELECT 
    'Recent Activity (Last 24 Hours)' as check_type,
    'Pending Invitations' as activity_type,
    COUNT(*) as count
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Recent Activity (Last 24 Hours)' as check_type,
    'New Relationships' as activity_type,
    COUNT(*) as count
FROM student_supervisor_relationships 
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Recent Activity (Last 24 Hours)' as check_type,
    'New Notifications' as activity_type,
    COUNT(*) as count
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 7. POTENTIAL ISSUES QUICK CHECK
-- ============================================================================
SELECT 
    'Potential Issues' as check_type,
    'Accepted invitations with null accepted_by' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'accepted' AND accepted_by IS NULL

UNION ALL

SELECT 
    'Potential Issues' as check_type,
    'Pending invitations older than 7 days' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Potential Issues' as check_type,
    'Invitations without relationshipType metadata' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE metadata->>'relationshipType' IS NULL;

-- ============================================================================
-- 8. INVITATION CONVERSION RATE
-- ============================================================================
WITH invitation_stats AS (
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invitations
    FROM pending_invitations
),
relationship_stats AS (
    SELECT COUNT(*) as total_relationships
    FROM student_supervisor_relationships
)
SELECT 
    'Conversion Rate Analysis' as check_type,
    i.total_invitations as total_invitations,
    i.accepted_invitations as accepted_invitations,
    r.total_relationships as total_relationships,
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
