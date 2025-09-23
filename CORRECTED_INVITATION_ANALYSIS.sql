-- CORRECTED INVITATION ANALYSIS - Using actual column names
-- Based on the discovered table structure

-- ============================================================================
-- 1. COLLECTION INVITATIONS ANALYSIS (CORRECTED)
-- ============================================================================
SELECT '=== COLLECTION INVITATIONS ANALYSIS ===' as section;

-- Status breakdown
SELECT 
    'Collection Invitations Status' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM collection_invitations 
GROUP BY status
ORDER BY count DESC;

-- Role breakdown
SELECT 
    'Collection Invitations Role' as analysis_type,
    role,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM collection_invitations 
GROUP BY role
ORDER BY count DESC;

-- Recent collection invitations (last 7 days)
SELECT 
    'Recent Collection Invitations (7 days)' as analysis_type,
    ci.id,
    ci.preset_id,
    ci.invited_user_id,
    ci.invited_by_user_id,
    ci.role,
    ci.status,
    ci.message,
    ci.created_at,
    ci.expires_at
FROM collection_invitations ci
WHERE ci.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ci.created_at DESC;

-- ============================================================================
-- 2. COLLECTION MEMBERS ANALYSIS
-- ============================================================================
SELECT '=== COLLECTION MEMBERS ANALYSIS ===' as section;

-- Total members count
SELECT 
    'Collection Members' as analysis_type,
    'Total members' as metric,
    COUNT(*) as count
FROM map_preset_members;

-- Recent members (last 7 days)
SELECT 
    'Recent Collection Members (7 days)' as analysis_type,
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.added_by,
    mpm.added_at
FROM map_preset_members mpm
WHERE mpm.added_at >= NOW() - INTERVAL '7 days'
ORDER BY mpm.added_at DESC;

-- ============================================================================
-- 3. INVITATION FLOW ANALYSIS
-- ============================================================================
SELECT '=== INVITATION FLOW ANALYSIS ===' as section;

-- Collection invitations by status and role
SELECT 
    'Collection Invitation Flow' as analysis_type,
    role,
    status,
    COUNT(*) as count
FROM collection_invitations 
GROUP BY role, status
ORDER BY role, status;

-- ============================================================================
-- 4. DATA INTEGRITY CHECKS
-- ============================================================================
SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for expired collection invitations
SELECT 
    'Data Integrity' as check_type,
    'Expired collection invitations' as issue,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending' AND expires_at < NOW()

UNION ALL

-- Check for old pending collection invitations
SELECT 
    'Data Integrity' as check_type,
    'Pending collection invitations older than 30 days' as issue,
    COUNT(*) as count
FROM collection_invitations 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days'

UNION ALL

-- Check for collection invitations without response
SELECT 
    'Data Integrity' as check_type,
    'Accepted/declined invitations without responded_at' as issue,
    COUNT(*) as count
FROM collection_invitations 
WHERE status IN ('accepted', 'declined') AND responded_at IS NULL;

-- ============================================================================
-- 5. CONVERSION ANALYSIS
-- ============================================================================
SELECT '=== CONVERSION ANALYSIS ===' as section;

-- Collection invitation conversion
WITH collection_invitation_stats AS (
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invitations,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_invitations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invitations
    FROM collection_invitations
),
collection_member_stats AS (
    SELECT COUNT(*) as total_members
    FROM map_preset_members
)
SELECT 
    'Collection Conversion Analysis' as analysis_type,
    ci.total_invitations as total_invitations,
    ci.accepted_invitations as accepted_invitations,
    ci.declined_invitations as declined_invitations,
    ci.pending_invitations as pending_invitations,
    cm.total_members as total_members,
    CASE 
        WHEN ci.total_invitations > 0 
        THEN ROUND((ci.accepted_invitations::decimal / ci.total_invitations) * 100, 2)
        ELSE 0 
    END as acceptance_rate_percent
FROM collection_invitation_stats ci, collection_member_stats cm;

-- ============================================================================
-- 6. RECENT ACTIVITY SUMMARY
-- ============================================================================
SELECT '=== RECENT ACTIVITY SUMMARY ===' as section;

-- Recent collection invitations
SELECT 
    'Recent Collection Invitations' as activity_type,
    COUNT(*) as count
FROM collection_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

-- Recent collection members
SELECT 
    'Recent Collection Members' as activity_type,
    COUNT(*) as count
FROM map_preset_members 
WHERE added_at >= NOW() - INTERVAL '7 days'

UNION ALL

-- Recent relationship invitations
SELECT 
    'Recent Relationship Invitations' as activity_type,
    COUNT(*) as count
FROM pending_invitations 
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

-- Recent relationships
SELECT 
    'Recent Relationships' as activity_type,
    COUNT(*) as count
FROM student_supervisor_relationships 
WHERE created_at >= NOW() - INTERVAL '7 days';
