-- COMPREHENSIVE INVITATION SYSTEM DEBUG ANALYSIS
-- This SQL script analyzes all invitation systems in the VROMM app
-- Run this to understand the current state and identify issues

-- ============================================================================
-- 1. DATABASE SCHEMA ANALYSIS
-- ============================================================================

-- Check if all required tables exist
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('pending_invitations', 'collection_invitations', 'notifications', 'student_supervisor_relationships', 'map_preset_members') 
        THEN '✅ Core invitation table'
        ELSE '📋 Other table'
    END as table_category
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'pending_invitations', 
        'collection_invitations', 
        'notifications', 
        'student_supervisor_relationships', 
        'map_preset_members',
        'map_presets',
        'profiles'
    )
ORDER BY table_category, table_name;

-- ============================================================================
-- 2. PENDING INVITATIONS ANALYSIS (Relationship Invitations)
-- ============================================================================

-- Check pending_invitations table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE 
        WHEN column_name = 'accepted_by' AND is_nullable = 'NO' 
        THEN '❌ ISSUE: accepted_by should be nullable for pending invitations'
        WHEN column_name = 'accepted_by' AND is_nullable = 'YES' 
        THEN '✅ OK: accepted_by is nullable'
        ELSE '📋 OK'
    END as constraint_status
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
ORDER BY ordinal_position;

-- Count invitations by status
SELECT 
    status,
    COUNT(*) as count,
    CASE 
        WHEN status = 'pending' THEN '🟡 Active invitations'
        WHEN status = 'accepted' THEN '✅ Accepted invitations'
        WHEN status = 'declined' THEN '❌ Declined invitations'
        WHEN status = 'cancelled' THEN '🚫 Cancelled invitations'
        WHEN status = 'expired' THEN '⏰ Expired invitations'
        ELSE '❓ Other status'
    END as status_description
FROM pending_invitations 
GROUP BY status 
ORDER BY count DESC;

-- Analyze invitation types and relationships
SELECT 
    COALESCE(metadata->>'relationshipType', 'unknown') as relationship_type,
    role,
    status,
    COUNT(*) as count,
    MIN(created_at) as earliest_invitation,
    MAX(created_at) as latest_invitation
FROM pending_invitations 
GROUP BY metadata->>'relationshipType', role, status
ORDER BY count DESC;

-- Check for problematic invitations (accepted_by null but status accepted)
SELECT 
    '❌ ISSUE: Accepted invitations with null accepted_by' as issue_type,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'accepted' AND accepted_by IS NULL

UNION ALL

-- Check for pending invitations with accepted_by set
SELECT 
    '❌ ISSUE: Pending invitations with accepted_by set' as issue_type,
    COUNT(*) as count
FROM pending_invitations 
WHERE status = 'pending' AND accepted_by IS NOT NULL;

-- Recent invitation activity (last 7 days)
SELECT 
    'Recent Invitations (Last 7 Days)' as analysis_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 3. COLLECTION INVITATIONS ANALYSIS
-- ============================================================================

-- Check if collection_invitations table exists and its structure
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations')
        THEN '✅ collection_invitations table exists'
        ELSE '❌ collection_invitations table MISSING'
    END as table_status;

-- If table exists, analyze it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_invitations') THEN
        RAISE NOTICE 'Collection Invitations Analysis:';
        RAISE NOTICE 'Table exists - analysis will be shown below';
    ELSE
        RAISE NOTICE '❌ collection_invitations table does not exist - collection sharing not available';
    END IF;
END $$;

-- Collection invitations analysis (if table exists)
SELECT 
    'Collection Invitations by Status' as analysis_type,
    status,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY status 
ORDER BY count DESC;

-- Recent collection invitations
SELECT 
    'Recent Collection Invitations (Last 7 days)' as analysis_type,
    COUNT(*) as total
FROM collection_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 4. NOTIFICATIONS ANALYSIS
-- ============================================================================

-- Check notifications table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN column_name = 'type' THEN '📋 Notification type column'
        WHEN column_name = 'user_id' THEN '👤 Target user'
        WHEN column_name = 'actor_id' THEN '🎭 Actor user'
        ELSE '📋 Other column'
    END as column_purpose
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Count notifications by type
SELECT 
    type,
    COUNT(*) as count,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read,
    CASE 
        WHEN type IN ('supervisor_invitation', 'student_invitation') THEN '🔗 Relationship invitations'
        WHEN type = 'collection_invitation' THEN '📁 Collection invitations'
        WHEN type IN ('follow', 'like', 'comment') THEN '💬 Social notifications'
        WHEN type IN ('route_review', 'message', 'mention') THEN '📝 Content notifications'
        ELSE '❓ Other notifications'
    END as notification_category
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- Recent notification activity
SELECT 
    'Recent Notifications (Last 7 Days)' as analysis_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
    COUNT(CASE WHEN type IN ('supervisor_invitation', 'student_invitation') THEN 1 END) as relationship_invites,
    COUNT(CASE WHEN type = 'collection_invitation' THEN 1 END) as collection_invites
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 5. RELATIONSHIPS ANALYSIS
-- ============================================================================

-- Check student_supervisor_relationships table
SELECT 
    'Student-Supervisor Relationships' as analysis_type,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
    MIN(created_at) as earliest_relationship,
    MAX(created_at) as latest_relationship
FROM student_supervisor_relationships;

-- Check for orphaned relationships (missing profiles)
SELECT 
    'Orphaned Relationships Analysis' as analysis_type,
    COUNT(CASE WHEN s.id IS NULL THEN 1 END) as missing_student_profiles,
    COUNT(CASE WHEN sup.id IS NULL THEN 1 END) as missing_supervisor_profiles,
    COUNT(*) as total_relationships
FROM student_supervisor_relationships ssr
LEFT JOIN profiles s ON ssr.student_id = s.id
LEFT JOIN profiles sup ON ssr.supervisor_id = sup.id;

-- ============================================================================
-- 6. COLLECTION MEMBERSHIPS ANALYSIS
-- ============================================================================

-- Check map_preset_members table
SELECT 
    'Collection Memberships' as analysis_type,
    COUNT(*) as total_memberships,
    COUNT(DISTINCT preset_id) as unique_collections,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_memberships,
    COUNT(CASE WHEN role = 'write' THEN 1 END) as write_memberships,
    COUNT(CASE WHEN role = 'read' THEN 1 END) as read_memberships
FROM map_preset_members;

-- ============================================================================
-- 7. INVITATION FLOW ANALYSIS
-- ============================================================================

-- Analyze invitation-to-relationship conversion rate
WITH invitation_stats AS (
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invitations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invitations,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_invitations
    FROM pending_invitations
),
relationship_stats AS (
    SELECT COUNT(*) as total_relationships
    FROM student_supervisor_relationships
)
SELECT 
    'Invitation System Health' as analysis_type,
    i.total_invitations,
    i.accepted_invitations,
    i.pending_invitations,
    i.declined_invitations,
    r.total_relationships,
    CASE 
        WHEN i.total_invitations > 0 
        THEN ROUND((i.accepted_invitations::decimal / i.total_invitations) * 100, 2)
        ELSE 0 
    END as acceptance_rate_percent,
    CASE 
        WHEN i.accepted_invitations > r.total_relationships 
        THEN '❌ ISSUE: More accepted invitations than relationships'
        WHEN i.accepted_invitations = r.total_relationships 
        THEN '✅ OK: Invitations match relationships'
        ELSE '⚠️ WARNING: More relationships than accepted invitations'
    END as conversion_status
FROM invitation_stats i, relationship_stats r;

-- ============================================================================
-- 8. COMPONENT-SPECIFIC ANALYSIS
-- ============================================================================

-- Analyze invitations by source (based on metadata)
SELECT 
    'Invitation Sources Analysis' as analysis_type,
    CASE 
        WHEN metadata->>'inviterRole' = 'student' THEN '🎓 Student invitations'
        WHEN metadata->>'inviterRole' = 'instructor' THEN '👨‍🏫 Instructor invitations'
        WHEN metadata->>'inviterRole' = 'school' THEN '🏫 School invitations'
        ELSE '❓ Unknown source'
    END as invitation_source,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
FROM pending_invitations 
GROUP BY metadata->>'inviterRole'
ORDER BY count DESC;

-- Check for custom messages in invitations
SELECT 
    'Custom Messages Analysis' as analysis_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN metadata->>'customMessage' IS NOT NULL AND metadata->>'customMessage' != '' THEN 1 END) as with_custom_message,
    COUNT(CASE WHEN metadata->>'customMessage' IS NULL OR metadata->>'customMessage' = '' THEN 1 END) as without_custom_message
FROM pending_invitations;

-- ============================================================================
-- 9. ERROR DETECTION
-- ============================================================================

-- Find potential issues
SELECT 'Potential Issues Found:' as issue_type, 'Check the following:' as description

UNION ALL

-- Check for invitations without proper metadata
SELECT 
    'Missing Metadata' as issue_type,
    CONCAT('Found ', COUNT(*), ' invitations with missing relationshipType') as description
FROM pending_invitations 
WHERE metadata->>'relationshipType' IS NULL

UNION ALL

-- Check for invitations with invalid roles
SELECT 
    'Invalid Roles' as issue_type,
    CONCAT('Found ', COUNT(*), ' invitations with invalid roles: ', string_agg(DISTINCT role, ', ')) as description
FROM pending_invitations 
WHERE role NOT IN ('student', 'instructor', 'teacher', 'supervisor', 'admin')

UNION ALL

-- Check for expired pending invitations
SELECT 
    'Expired Invitations' as issue_type,
    CONCAT('Found ', COUNT(*), ' pending invitations older than 30 days') as description
FROM pending_invitations 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days'

UNION ALL

-- Check for duplicate invitations
SELECT 
    'Duplicate Invitations' as issue_type,
    CONCAT('Found ', COUNT(*) - COUNT(DISTINCT email, invited_by), ' potential duplicate invitations') as description
FROM pending_invitations 
WHERE status = 'pending';

-- ============================================================================
-- 10. RECOMMENDATIONS
-- ============================================================================

-- Generate recommendations based on analysis
SELECT 
    'System Recommendations:' as recommendation_type,
    'Based on the analysis above, consider the following actions:' as description

UNION ALL

SELECT 
    'Cleanup Actions' as recommendation_type,
    '1. Clean up expired pending invitations
2. Fix any orphaned relationships
3. Ensure all accepted invitations have proper accepted_by values
4. Verify collection_invitations table exists and is properly configured' as description

UNION ALL

SELECT 
    'Monitoring Actions' as recommendation_type,
    '1. Set up monitoring for invitation conversion rates
2. Track notification delivery success
3. Monitor for failed relationship creation
4. Check for RLS policy issues' as description

UNION ALL

SELECT 
    'Component Integration' as recommendation_type,
    '1. Verify all components use consistent invitation creation
2. Ensure proper error handling in invitation flows
3. Test end-to-end invitation acceptance flows
4. Validate notification creation and delivery' as description;
