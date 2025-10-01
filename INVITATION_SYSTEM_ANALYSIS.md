# VROMM Invitation System Analysis

## Overview
The VROMM app has **two distinct invitation systems** that serve different purposes:

1. **Relationship Invitations** - For connecting students with instructors/supervisors
2. **Collection Invitations** - For sharing map collections/presets with other users

## 1. Relationship Invitations System

### Purpose
- Connect students with instructors/supervisors
- Enable supervision relationships
- Support bidirectional invitations (student→instructor, instructor→student)

### Components Involved
- `OnboardingInteractive.tsx` - Main onboarding flow
- `GettingStarted.tsx` - Home screen getting started section
- `RelationshipManagementModal.tsx` - Profile management
- `InvitationModal.tsx` - Handle incoming invitations
- `NotificationsSheet.tsx` - Display notifications

### Database Tables
- **`pending_invitations`** - Stores relationship invitations
- **`student_supervisor_relationships`** - Active relationships
- **`notifications`** - In-app notifications
- **`profiles`** - User information

### Invitation Flow
```
1. User A invites User B (via any component)
2. Record created in `pending_invitations` table
3. Notification created in `notifications` table
4. User B receives notification
5. User B accepts/declines invitation
6. If accepted: relationship created in `student_supervisor_relationships`
7. Invitation status updated to 'accepted'
```

### Key Fields in `pending_invitations`
- `email` - Target user's email
- `role` - Role being invited to ('student', 'instructor')
- `invited_by` - User ID of inviter
- `status` - 'pending', 'accepted', 'declined', 'cancelled'
- `metadata` - JSON with relationship details
- `accepted_by` - User ID who accepted (nullable for pending)
- `accepted_at` - Timestamp of acceptance

### Metadata Structure
```json
{
  "relationshipType": "student_invites_supervisor" | "supervisor_invites_student",
  "inviterRole": "student" | "instructor" | "school",
  "supervisorName": "Inviter's name",
  "targetUserId": "Target user's ID",
  "targetUserName": "Target user's name",
  "customMessage": "Optional personal message",
  "invitedAt": "2025-01-21T12:00:00.000Z"
}
```

## 2. Collection Invitations System

### Purpose
- Share map collections/presets with other users
- Enable collaborative collection management
- Support different permission levels (read, write, admin)

### Components Involved
- `AddToPresetSheet.tsx` - Add routes to collections
- `CollectionSharingModal.tsx` - Share collections
- `FilterSheet.tsx` - Collection filtering
- `UnifiedInvitationModal.tsx` - Handle collection invitations

### Database Tables
- **`collection_invitations`** - Stores collection sharing invitations
- **`map_preset_members`** - Collection membership
- **`map_presets`** - Collections/presets
- **`notifications`** - In-app notifications

### Invitation Flow
```
1. User A shares collection with User B
2. Record created in `collection_invitations` table
3. Notification created in `notifications` table
4. User B receives notification
5. User B accepts/declines invitation
6. If accepted: membership created in `map_preset_members`
7. Invitation status updated to 'accepted'
```

### Key Fields in `collection_invitations`
- `preset_id` - Collection being shared
- `invited_user_id` - Target user's ID
- `invited_by_user_id` - User ID of sharer
- `role` - Permission level ('read', 'write', 'admin')
- `status` - 'pending', 'accepted', 'declined', 'archived'
- `message` - Optional sharing message
- `expires_at` - Expiration date

## 3. Notification Types

### Relationship Notifications
- `supervisor_invitation` - Student invited to be supervised
- `student_invitation` - Instructor invited to supervise

### Collection Notifications
- `collection_invitation` - Collection shared with user

### Other Notifications
- `follow`, `like`, `comment` - Social interactions
- `route_review`, `message`, `mention` - Content interactions

## 4. Component Analysis

### OnboardingInteractive.tsx
- **Purpose**: Main onboarding flow for new users
- **Invitation Type**: Relationship invitations
- **Key Functions**:
  - `handleCreateSelectedConnections()` - Create relationship invitations
  - `loadExistingRelationships()` - Load current relationships
  - `handleConnectWithUser()` - Connect with specific user

### GettingStarted.tsx
- **Purpose**: Home screen getting started section
- **Invitation Type**: Relationship invitations
- **Key Functions**:
  - `handleCreateConnections()` - Create relationship invitations
  - `loadPendingInvitations()` - Load pending invitations
  - `loadExistingRelationships()` - Load current relationships

### AddToPresetSheet.tsx
- **Purpose**: Add routes to collections
- **Invitation Type**: Collection invitations (via CollectionSharingModal)
- **Key Functions**:
  - `showSharingSheet()` - Open collection sharing modal
  - `handleTogglePreset()` - Add/remove routes from collections

### CollectionSharingModal.tsx
- **Purpose**: Share collections with other users
- **Invitation Type**: Collection invitations
- **Key Functions**:
  - `handleSendInvitations()` - Send collection invitations
  - `handleSearchUsers()` - Search for users to invite

### InvitationModal.tsx
- **Purpose**: Handle incoming invitations
- **Invitation Type**: Both relationship and collection invitations
- **Key Functions**:
  - `handleAcceptInvitation()` - Accept invitations
  - `handleDeclineInvitation()` - Decline invitations

### NotificationsSheet.tsx
- **Purpose**: Display and manage notifications
- **Invitation Type**: All notification types
- **Key Functions**:
  - `handleMarkAllAsRead()` - Mark notifications as read
  - `handleArchiveAll()` - Archive notifications

## 5. Common Issues Identified

### Database Schema Issues
1. **`accepted_by` constraint**: Should be nullable for pending invitations
2. **Missing tables**: `collection_invitations` table may not exist
3. **RLS policies**: May be blocking invitation operations

### Invitation Flow Issues
1. **Inconsistent metadata**: Different components may use different metadata structures
2. **Notification creation**: May fail silently
3. **Relationship creation**: May not be triggered on invitation acceptance
4. **Error handling**: Insufficient error handling in invitation flows

### Component Integration Issues
1. **Duplicate logic**: Similar invitation creation logic across components
2. **Inconsistent error handling**: Different error handling approaches
3. **State management**: May not properly sync invitation states

## 6. Recommendations

### Immediate Actions
1. **Run the debug SQL script** to identify current issues
2. **Fix database constraints** (especially `accepted_by` nullable)
3. **Ensure all tables exist** and have proper RLS policies
4. **Test invitation flows** end-to-end

### Long-term Improvements
1. **Unify invitation logic** across components
2. **Implement proper error handling** and user feedback
3. **Add monitoring** for invitation success rates
4. **Create comprehensive tests** for invitation flows

### Monitoring
1. **Track invitation conversion rates**
2. **Monitor notification delivery**
3. **Check for failed relationship creation**
4. **Validate RLS policy effectiveness**

## 7. SQL Debug Queries

Run the `COMPREHENSIVE_INVITATION_DEBUG_ANALYSIS.sql` script to:
- Analyze current database state
- Identify missing tables or constraints
- Check invitation conversion rates
- Find potential issues
- Generate recommendations

This analysis will help identify exactly what's working and what needs to be fixed in the invitation system.
