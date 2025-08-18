# 🔄 **Relationship Management System - Mobile to Web Handover**

## 📋 **Overview**

This document provides complete instructions for implementing the student-supervisor relationship management system from the React Native mobile app into the React.js web project. The system handles bidirectional invitations, real-time notifications, relationship reviews, and comprehensive management flows.

---

## 🗄️ **Database Schema (Already Exists)**

### **Core Tables**
```sql
-- Main relationship table
student_supervisor_relationships (
  student_id UUID,
  supervisor_id UUID, 
  created_at TIMESTAMP,
  status TEXT DEFAULT 'active'
)

-- Invitation system
pending_invitations (
  id UUID,
  email TEXT,
  role user_role,
  invited_by UUID,
  status TEXT, -- 'pending', 'accepted', 'rejected', 'cancelled'
  metadata JSONB, -- Contains custom messages, relationship types
  accepted_at TIMESTAMP,
  accepted_by UUID,
  created_at TIMESTAMP
)

-- Review system
relationship_reviews (
  id UUID,
  student_id UUID,
  supervisor_id UUID,
  reviewer_id UUID,
  rating INTEGER (1-5),
  content TEXT,
  review_type TEXT, -- 'student_reviews_supervisor' | 'supervisor_reviews_student'
  is_anonymous BOOLEAN,
  created_at TIMESTAMP
)

-- Notifications
notifications (
  id UUID,
  user_id UUID,
  actor_id UUID,
  type notification_type, -- 'supervisor_invitation', 'student_invitation', 'new_message'
  title TEXT,
  message TEXT,
  metadata JSONB, -- Contains notification_subtype for relationship events
  is_read BOOLEAN,
  created_at TIMESTAMP
)
```

### **Key Metadata Structures**
```typescript
// Invitation metadata
interface InvitationMetadata {
  supervisorName?: string;
  inviterRole: 'student' | 'instructor' | 'admin' | 'school';
  relationshipType: 'student_invites_supervisor' | 'supervisor_invites_student';
  customMessage?: string;
  targetUserId?: string;
  targetUserName?: string;
}

// Notification metadata for relationship events
interface RelationshipNotificationMetadata {
  notification_subtype: 'relationship_review' | 'relationship_removed' | 'invitation_accepted';
  relationship_type?: string;
  invitation_id?: string;
  reviewer_id?: string;
  reviewed_user_id?: string;
}
```

---

## 🎯 **Implementation Targets**

### **1. ProfileDialog.tsx Enhancement**
**Location**: `src/components/dialogs/ProfileDialog.tsx`

**Add New Tab**: "Supervisors" (alongside existing "General" tab)
- Default tab remains "General" 
- New "Supervisors" tab contains full relationship management
- Reuse all logic from `RelationshipManagementModal.tsx`

**Required Sections in Supervisors Tab**:
```typescript
// Four main sections (tabs within the tab)
interface SupervisorsTabSections {
  requests: 'view',      // Request supervisors (for students)
  current: 'manage',     // Current relationships 
  invite: 'invite',      // Invite new users
  pending: 'pending'     // Pending invitations
}
```

### **2. UserListModal.tsx Enhancement**
**Location**: `src/components/UserListModal.tsx:180:14`

**Add Relationship Buttons**: Similar to `UsersScreen.tsx` and `UsersList.tsx`
```typescript
// Add these buttons for each user
{currentUserRole === 'student' && user.role === 'instructor' && (
  <Button onClick={() => handleInstructorToggle(user.id)}>
    {user.isInstructor ? 'Remove Instructor' : 'Set as Instructor'}
  </Button>
)}

{['instructor', 'admin', 'school'].includes(currentUserRole) && user.role === 'student' && (
  <Button onClick={() => handleStudentToggle(user.id)}>
    {user.isStudent ? 'Remove Student' : 'Set as Student'}
  </Button>
)}
```

### **3. PublicProfileDialog.tsx Enhancement**
**Location**: `src/components/dialogs/PublicProfileDialog.tsx`

**Add Relationship Management**:
- Relationship action buttons (same as `PublicProfileScreen.tsx`)
- Relationship reviews section integration
- Pending invitation status display

### **4. NotificationBell.tsx Enhancement**
**Location**: `/Users/daniellauding/Work/instinctly/internal/vromm/vromm-routes/src/components/NotificationBell.tsx`

**Add Relationship Notifications**:
- Invitation notifications with Accept/Reject buttons
- Review submitted notifications
- Relationship ended notifications
- Real-time updates without force reload

---

## 🔧 **Core Components to Implement**

### **1. RelationshipManagementPanel.tsx** (New)
```typescript
interface RelationshipManagementPanelProps {
  userRole: 'student' | 'instructor' | 'admin' | 'school';
  supervisedStudents?: Array<{ id: string; full_name: string; email: string; relationship_created?: string }>;
  onStudentSelect?: (studentId: string | null) => void;
  availableSupervisors?: Array<{ id: string; full_name: string; email: string }>;
  onRefresh?: () => Promise<void>;
}

// Four main tabs:
// 1. Request/View Tab - Request supervisors (students) or select students (instructors)
// 2. Current/Manage Tab - Current relationships with removal options
// 3. Invite Tab - Search existing users or invite new ones with custom messages
// 4. Pending Tab - Sent/received invitations with accept/reject actions
```

### **2. RelationshipReviewSection.tsx** (Port from mobile)
```typescript
interface RelationshipReviewSectionProps {
  profileUserId: string;
  profileUserRole: 'student' | 'instructor' | 'supervisor' | 'school';
  profileUserName: string;
  canReview: boolean;
  reviews: RelationshipReview[];
  onReviewAdded: () => void;
}

// Features:
// - 5-star rating system
// - Text review with image uploads
// - Anonymous review option
// - "Review Back" functionality
// - Admin moderation (report/delete)
```

### **3. RelationshipReviewModal.tsx** (Port from mobile)
```typescript
interface RelationshipReviewModalProps {
  visible: boolean;
  onClose: () => void;
  profileUserId: string;
  profileUserRole: string;
  profileUserName: string;
  title?: string;
  subtitle?: string;
  isRemovalContext?: boolean; // When leaving a relationship
  onRemovalComplete?: () => void;
}
```

---

## 🔄 **Core Flows**

### **Flow 1: Student Invites Supervisor**
```typescript
// 1. Student searches for instructor/admin/school user
// 2. Student clicks "Invite as Supervisor" 
// 3. Optional custom message added
// 4. Creates pending_invitation with metadata:
{
  relationshipType: 'student_invites_supervisor',
  inviterRole: 'student',
  customMessage: 'Please be my supervisor...'
}
// 5. Notification sent to target user
// 6. Target user sees notification with Accept/Reject buttons
// 7. On Accept: Creates student_supervisor_relationship
// 8. On Reject: Deletes invitation and related notifications
```

### **Flow 2: Supervisor Invites Student**
```typescript
// 1. Instructor/admin/school searches for student
// 2. Clicks "Invite as Student"
// 3. Optional custom message added
// 4. Creates pending_invitation with metadata:
{
  relationshipType: 'supervisor_invites_student', 
  inviterRole: 'instructor',
  customMessage: 'Join my class...'
}
// 5. Student receives notification
// 6. Student accepts/rejects
// 7. On Accept: Creates student_supervisor_relationship
```

### **Flow 3: Leaving Relationship with Review**
```typescript
// 1. User clicks "Remove Supervisor" or "Remove Student"
// 2. RelationshipReviewModal opens (not simple text prompt)
// 3. User submits rating + review + optional message
// 4. System calls removeSupervisorRelationship() which:
//    - Deletes the relationship (bidirectional)
//    - Cleans up pending invitations between users
//    - Sends notifications to both parties
//    - Allows fresh invitations between the users
```

### **Flow 4: Real-time Updates**
```typescript
// Supabase subscriptions for live updates:
// 1. pending_invitations table changes
// 2. student_supervisor_relationships table changes  
// 3. notifications table changes
// 4. relationship_reviews table changes

// No force reload needed - everything updates automatically
```

---

## 📡 **Supabase Services to Port**

### **1. invitationService.ts** (Core Functions)
```typescript
// Key functions to implement:
export async function inviteNewUser(data: InvitationData): Promise<Result>
export async function acceptInvitationById(invitationId: string, userId: string): Promise<boolean>
export async function rejectInvitation(invitationId: string): Promise<boolean>
export async function cancelInvitation(invitationId: string): Promise<boolean>
export async function removeSupervisorRelationship(studentId: string, supervisorId: string, message?: string, removedByUserId?: string): Promise<boolean>
export async function getPendingInvitations(userId: string): Promise<Invitation[]>
export async function getIncomingInvitations(email: string): Promise<Invitation[]>
export async function getStudentSupervisors(studentId: string): Promise<Supervisor[]>
```

### **2. relationshipReviewService.ts**
```typescript
export class RelationshipReviewService {
  static async getUserRating(userId: string, userRole: string): Promise<UserRating>
  static async getReviewsForUser(userId: string): Promise<RelationshipReview[]>
  static async submitReview(reviewData: ReviewData): Promise<boolean>
}
```

### **3. notificationService.ts**
```typescript
export class NotificationService {
  static async getNotifications(limit?: number, offset?: number, includeArchived?: boolean): Promise<Notification[]>
  static async markAsRead(notificationId: string): Promise<void>
  static async subscribeToNotifications(callback: (notification: Notification) => void): Subscription
}
```

---

## 🎨 **UI Components Architecture**

### **ProfileDialog.tsx Structure**
```tsx
export function ProfileDialog({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState<'general' | 'supervisors'>('general');
  
  return (
    <Dialog>
      <DialogContent>
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            {/* Existing general profile content */}
          </TabsContent>
          
          <TabsContent value="supervisors">
            <RelationshipManagementPanel 
              userRole={currentUser.role}
              supervisedStudents={supervisedStudents}
              availableSupervisors={availableSupervisors}
              onRefresh={handleRefresh}
            />
            
            <RelationshipReviewSection
              profileUserId={userId}
              profileUserRole={profile.role}
              profileUserName={profile.full_name}
              canReview={userRating.canReview}
              reviews={relationshipReviews}
              onReviewAdded={loadRelationshipReviews}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### **RelationshipManagementPanel.tsx Structure**
```tsx
export function RelationshipManagementPanel({ userRole, ...props }) {
  const [activeSection, setActiveSection] = useState<'view' | 'manage' | 'invite' | 'pending'>('manage');
  
  return (
    <Card>
      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList>
          {userRole === 'student' ? (
            <>
              <TabsTrigger value="view">Request</TabsTrigger>
              <TabsTrigger value="manage">Current</TabsTrigger>
              <TabsTrigger value="invite">Invite New</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="manage">My Students</TabsTrigger>
              <TabsTrigger value="view">Select Student</TabsTrigger>
              <TabsTrigger value="invite">Invite</TabsTrigger>
            </>
          )}
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view">{renderRequestTab()}</TabsContent>
        <TabsContent value="manage">{renderCurrentTab()}</TabsContent>
        <TabsContent value="invite">{renderInviteTab()}</TabsContent>
        <TabsContent value="pending">{renderPendingTab()}</TabsContent>
      </Tabs>
    </Card>
  );
}
```

---

## 🚀 **Step-by-Step Implementation**

### **Phase 1: Core Services (Week 1)**
1. **Port invitation services** from mobile app
2. **Port notification services** with real-time subscriptions
3. **Port relationship review services**
4. **Test database connectivity** and RLS policies

### **Phase 2: UI Components (Week 2)**
1. **Create RelationshipManagementPanel.tsx**
   - Four-tab interface (Request/Current/Invite/Pending)
   - Search existing users functionality
   - Invite new users with custom messages
   - Real-time invitation status updates

2. **Create RelationshipReviewSection.tsx**
   - 5-star rating system
   - Text reviews with image upload
   - Anonymous review option
   - "Review Back" functionality

3. **Create RelationshipReviewModal.tsx**
   - Modal wrapper for relationship removal flow
   - Integrates review submission with relationship ending

### **Phase 3: Integration (Week 3)**
1. **Enhance ProfileDialog.tsx**
   - Add "Supervisors" tab
   - Integrate relationship management panel
   - Add relationship reviews section

2. **Enhance UserListModal.tsx**
   - Add "Set as Student/Instructor" buttons
   - Handle relationship state display
   - Integrate invitation flows

3. **Enhance PublicProfileDialog.tsx**
   - Add relationship action buttons
   - Show pending invitation status
   - Display relationship reviews

### **Phase 4: Notifications (Week 4)**
1. **Enhance NotificationBell.tsx**
   - Add relationship notification types
   - Implement Accept/Reject buttons in notifications
   - Handle review and removal notifications
   - Real-time updates without page reload

---

## 🔔 **Notification Types to Handle**

### **Invitation Notifications**
```typescript
// Type: 'supervisor_invitation' | 'student_invitation'
interface InvitationNotification {
  type: 'supervisor_invitation' | 'student_invitation';
  title: 'New Supervision Request';
  message: 'John wants you to be their supervisor';
  metadata: {
    relationship_type: 'student_invites_supervisor';
    from_user_id: string;
    invitation_id: string;
    customMessage?: string; // Show in notification if present
  };
  actions: ['Accept', 'Reject']; // Buttons in notification
}
```

### **Review Notifications**
```typescript
// Type: 'new_message' with subtype
interface ReviewNotification {
  type: 'new_message';
  title: 'New Review!';
  message: 'John left you a 5-star review';
  metadata: {
    notification_subtype: 'relationship_review';
    reviewer_id: string;
    reviewed_user_id: string;
    rating: number;
  };
  action: 'Navigate to profile to see review';
}
```

### **Relationship Removal Notifications**
```typescript
// Type: 'new_message' with subtype
interface RemovalNotification {
  type: 'new_message';
  title: 'Relationship Ended';
  message: 'John ended your supervisory relationship';
  metadata: {
    notification_subtype: 'relationship_removed';
    removed_by_id: string;
    other_party_id: string;
  };
  note: 'Both parties can invite each other again';
}
```

---

## 🎛️ **Button States and Logic**

### **Relationship Action Buttons**
```typescript
// In UserListModal, PublicProfileDialog, etc.
interface RelationshipButtonState {
  // No relationship, no pending invitation
  default: 'Set as Student' | 'Set as Instructor';
  
  // Active relationship exists  
  active: 'Remove Student' | 'Remove Instructor';
  
  // Pending invitation sent by current user
  pending_sent: 'Invitation Sent' | 'Cancel Invitation';
  
  // Pending invitation received by current user
  pending_received: 'Accept Invitation' | 'Reject Invitation';
  
  // Loading state
  loading: 'Loading...';
}

// Button color coding:
const buttonColors = {
  set: '$green10',      // Green for setting relationship
  remove: '$red9',      // Red for removing
  pending: '$orange5',  // Orange for pending
  accept: '$green9',    // Green for accept
  reject: '$red9'       // Red for reject
};
```

### **Real-time State Management**
```typescript
// Use React Query or SWR for real-time data
const { data: relationships, mutate: refreshRelationships } = useSWR(
  `/api/relationships/${userId}`,
  fetchUserRelationships
);

const { data: pendingInvitations, mutate: refreshInvitations } = useSWR(
  `/api/invitations/pending/${userId}`,
  fetchPendingInvitations
);

// Supabase real-time subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('relationship_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public', 
      table: 'student_supervisor_relationships'
    }, () => refreshRelationships())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pending_invitations'
    }, () => refreshInvitations())
    .subscribe();
    
  return () => subscription.unsubscribe();
}, []);
```

---

## 📝 **Key Functions to Implement**

### **1. Invitation Management**
```typescript
// Send invitation to existing user
async function sendInvitation(targetUserId: string, relationshipType: string, customMessage?: string) {
  const targetUser = await getUser(targetUserId);
  
  const invitation = await supabase
    .from('pending_invitations')
    .insert({
      email: targetUser.email,
      role: relationshipType === 'student_invites_supervisor' ? 'instructor' : 'student',
      invited_by: currentUser.id,
      metadata: {
        relationshipType,
        inviterRole: currentUser.role,
        customMessage,
        targetUserId,
        targetUserName: targetUser.full_name
      },
      status: 'pending'
    });
    
  // Create notification
  await supabase.from('notifications').insert({
    user_id: targetUserId,
    actor_id: currentUser.id,
    type: relationshipType === 'student_invites_supervisor' ? 'supervisor_invitation' : 'student_invitation',
    title: 'New Supervision Request',
    message: `${currentUser.full_name} wants you to be their ${relationshipType === 'student_invites_supervisor' ? 'supervisor' : 'student'}`,
    metadata: {
      relationship_type: relationshipType,
      invitation_id: invitation.id,
      customMessage
    }
  });
}

// Accept invitation
async function acceptInvitation(invitationId: string) {
  const invitation = await getInvitation(invitationId);
  
  // Update invitation status
  await supabase
    .from('pending_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitationId);
    
  // Create relationship
  const { studentId, supervisorId } = determineRelationshipDirection(invitation);
  await supabase
    .from('student_supervisor_relationships')
    .insert({ student_id: studentId, supervisor_id: supervisorId });
    
  // Send acceptance notification
  await createAcceptanceNotification(invitation);
  
  // Clean up invitation notification
  await deleteInvitationNotification(invitationId);
}

// Reject invitation  
async function rejectInvitation(invitationId: string) {
  // Delete invitation (don't just update status)
  await supabase
    .from('pending_invitations')
    .delete()
    .eq('id', invitationId);
    
  // Clean up related notifications
  await supabase
    .from('notifications')
    .delete()
    .eq('metadata->>invitation_id', invitationId);
}
```

### **2. Relationship Management**
```typescript
// Remove relationship with review
async function removeRelationshipWithReview(targetUserId: string, review: ReviewData) {
  // 1. Submit review first
  await submitRelationshipReview(review);
  
  // 2. Remove relationship (bidirectional)
  await supabase
    .from('student_supervisor_relationships')
    .delete()
    .or(`and(student_id.eq.${currentUser.id},supervisor_id.eq.${targetUserId}),and(student_id.eq.${targetUserId},supervisor_id.eq.${currentUser.id})`);
    
  // 3. Clean up pending invitations
  await supabase
    .from('pending_invitations')
    .delete()
    .or(`and(invited_by.eq.${currentUser.id},email.eq.${targetUser.email}),and(invited_by.eq.${targetUserId},email.eq.${currentUser.email})`);
    
  // 4. Send notifications to both parties
  await createRemovalNotifications(currentUser.id, targetUserId, review.content);
}

// Check relationship status
async function getRelationshipStatus(userId1: string, userId2: string) {
  // Check active relationship
  const relationship = await supabase
    .from('student_supervisor_relationships')
    .select('*')
    .or(`and(student_id.eq.${userId1},supervisor_id.eq.${userId2}),and(student_id.eq.${userId2},supervisor_id.eq.${userId1})`)
    .single();
    
  // Check pending invitations
  const pendingInvitations = await checkPendingInvitations(userId1, userId2);
  
  return {
    hasRelationship: !!relationship,
    relationshipType: relationship ? determineRelationshipType(relationship, userId1) : null,
    pendingInvitation: pendingInvitations.find(inv => inv.status === 'pending'),
    canInvite: !relationship && !pendingInvitations.length
  };
}
```

### **3. Review System**
```typescript
// Submit review
async function submitRelationshipReview(reviewData: RelationshipReviewData) {
  const review = await supabase
    .from('relationship_reviews')
    .insert({
      student_id: reviewData.studentId,
      supervisor_id: reviewData.supervisorId,
      reviewer_id: currentUser.id,
      rating: reviewData.rating,
      content: reviewData.content,
      review_type: reviewData.reviewType,
      is_anonymous: reviewData.isAnonymous
    });
    
  // Create notification for reviewed user
  await supabase.from('notifications').insert({
    user_id: reviewData.reviewedUserId,
    actor_id: reviewData.isAnonymous ? null : currentUser.id,
    type: 'new_message',
    title: 'New Review!',
    message: `${reviewData.isAnonymous ? 'Someone' : currentUser.full_name} left you a ${reviewData.rating}-star review`,
    metadata: {
      notification_subtype: 'relationship_review',
      reviewer_id: currentUser.id,
      reviewed_user_id: reviewData.reviewedUserId,
      rating: reviewData.rating
    }
  });
}

// Check if user can review back
async function canReviewBack(currentUserId: string, profileUserId: string) {
  const reviews = await getRelationshipReviews(profileUserId);
  
  // Profile user reviewed current user
  const profileUserReviewedMe = reviews.some(review => 
    review.reviewer_id === profileUserId && 
    (review.student_id === currentUserId || review.supervisor_id === currentUserId)
  );
  
  // Current user hasn't reviewed profile user back
  const iHaveReviewedThem = reviews.some(review => 
    review.reviewer_id === currentUserId && 
    (review.student_id === profileUserId || review.supervisor_id === profileUserId)
  );
  
  return profileUserReviewedMe && !iHaveReviewedThem;
}
```

---

## 🔄 **Real-time Subscriptions**

### **Setup Supabase Subscriptions**
```typescript
// In main app component or context
useEffect(() => {
  if (!currentUser?.id) return;
  
  const subscriptions = [
    // Relationship changes
    supabase
      .channel('relationships')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_supervisor_relationships',
        filter: `student_id=eq.${currentUser.id}`
      }, handleRelationshipChange)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'student_supervisor_relationships',
        filter: `supervisor_id=eq.${currentUser.id}`
      }, handleRelationshipChange),
      
    // Invitation changes
    supabase
      .channel('invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'pending_invitations',
        filter: `invited_by=eq.${currentUser.id}`
      }, handleInvitationChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pending_invitations', 
        filter: `email=eq.${currentUser.email}`
      }, handleInvitationChange),
      
    // Notification changes
    supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, handleNotificationChange)
  ];
  
  subscriptions.forEach(sub => sub.subscribe());
  
  return () => subscriptions.forEach(sub => sub.unsubscribe());
}, [currentUser?.id]);
```

---

## 🎯 **NotificationBell.tsx Enhancement**

### **Add Relationship Notification Types**
```tsx
export function NotificationBell() {
  const { notifications, markAsRead } = useNotifications();
  
  const handleNotificationAction = async (notification: Notification, action: 'accept' | 'reject') => {
    const invitationId = notification.metadata?.invitation_id;
    
    if (action === 'accept') {
      await acceptInvitationById(invitationId, currentUser.id);
      showToast('Invitation accepted! Relationship created.');
    } else {
      await rejectInvitation(invitationId);
      showToast('Invitation rejected');
    }
    
    // Remove notification from list (real-time will handle this)
    await markAsRead(notification.id);
  };
  
  const renderNotification = (notification: Notification) => {
    switch (notification.type) {
      case 'supervisor_invitation':
      case 'student_invitation':
        return (
          <NotificationItem key={notification.id}>
            <NotificationContent>
              <Text>{notification.message}</Text>
              {notification.metadata?.customMessage && (
                <CustomMessageBox>
                  💬 "{notification.metadata.customMessage}"
                </CustomMessageBox>
              )}
            </NotificationContent>
            <NotificationActions>
              <Button 
                variant="success" 
                size="sm"
                onClick={() => handleNotificationAction(notification, 'accept')}
              >
                Accept
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleNotificationAction(notification, 'reject')}
              >
                Reject
              </Button>
            </NotificationActions>
          </NotificationItem>
        );
        
      case 'new_message':
        if (notification.metadata?.notification_subtype === 'relationship_review') {
          return (
            <NotificationItem 
              onClick={() => navigateToProfile(notification.metadata.reviewed_user_id)}
            >
              <Text>{notification.message}</Text>
              <Text variant="muted">Click to see review and review back</Text>
            </NotificationItem>
          );
        }
        break;
        
      // ... other notification types
    }
  };
}
```

---

## 🧪 **Testing Scenarios**

### **Test Case 1: Student Invites Supervisor**
1. Student searches for instructor in ProfileDialog > Supervisors tab
2. Student clicks "Set as Instructor" → Opens invitation flow
3. Student adds custom message: "Please help me with my driving practice"
4. Instructor receives notification with Accept/Reject buttons
5. Instructor clicks Accept → Relationship created, both users notified
6. Both users can see relationship with timestamps in their profiles

### **Test Case 2: Supervisor Invites Student**
1. Instructor in ProfileDialog > Supervisors > My Students tab
2. Instructor clicks "Invite" → Search for student or enter new email
3. Instructor adds message: "Join my advanced driving class"
4. Student receives notification with custom message
5. Student accepts → Relationship created with proper direction

### **Test Case 3: Leaving Relationship with Review**
1. Student clicks "Remove Supervisor" in ProfileDialog > Supervisors > Current tab
2. RelationshipReviewModal opens (not simple text prompt)
3. Student submits 4-star review: "Great instructor, helped me improve"
4. System removes relationship bidirectionally
5. Both parties receive "relationship ended" notifications
6. Both parties can invite each other again (fresh start)

### **Test Case 4: Review Back Flow**
1. Instructor leaves review for student
2. Student sees notification: "John left you a review"
3. Student clicks notification → Goes to instructor's profile
4. Student sees "Review Back" button (green with arrow-left icon)
5. Student submits counter-review
6. Both reviews visible in relationship history

---

## 🔧 **Development Tips**

### **Reuse Mobile Components**
- Copy logic from `RelationshipManagementModal.tsx` tabs
- Port state management patterns from mobile screens
- Reuse invitation service functions with minimal changes
- Copy notification handling patterns from `NotificationsScreen.tsx`

### **Styling Consistency**
```typescript
// Button variants to match mobile app
const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  secondary: 'bg-gray-600 hover:bg-gray-700', 
  success: 'bg-green-600 hover:bg-green-700',
  destructive: 'bg-red-600 hover:bg-red-700',
  warning: 'bg-orange-600 hover:bg-orange-700'
};

// Icon consistency
const relationshipIcons = {
  student: 'user',
  instructor: 'user-check',
  invite: 'user-plus',
  remove: 'user-x',
  pending: 'clock',
  review: 'star',
  message: 'message-circle'
};
```

### **Error Handling**
```typescript
// Consistent error handling across all relationship actions
try {
  const result = await relationshipAction();
  if (result.success) {
    showToast(result.message, 'success');
    refreshData();
  } else {
    showToast(result.error, 'error');
  }
} catch (error) {
  console.error('Relationship action failed:', error);
  showToast('Action failed. Please try again.', 'error');
}
```

---

## 🎯 **Success Criteria**

### **MVP Requirements**
- ✅ **Bidirectional Invitations**: Students can invite supervisors, supervisors can invite students
- ✅ **Custom Messages**: Optional personal messages in invitations
- ✅ **Real-time Updates**: No manual refresh needed for invitations/notifications
- ✅ **Relationship Reviews**: Rate and review before leaving relationships
- ✅ **Comprehensive Notifications**: All relationship events create appropriate notifications
- ✅ **Clean UI Integration**: Seamless integration into existing ProfileDialog and UserListModal

### **Advanced Features**
- ✅ **Review Back System**: Mutual review capability
- ✅ **Pending Invitation Management**: Full CRUD for invitations
- ✅ **Relationship History**: Timestamps for all relationship events
- ✅ **Bidirectional Removal**: Clean relationship ending with fresh invite capability
- ✅ **Anonymous Reviews**: Optional anonymous feedback
- ✅ **Admin Moderation**: Report and delete inappropriate reviews

---

## 📚 **Reference Files**

### **Mobile App Files to Reference**
```
Core Logic:
- src/components/RelationshipManagementModal.tsx (4-tab interface)
- src/components/RelationshipReviewSection.tsx (review system)
- src/components/RelationshipReviewModal.tsx (removal flow)
- src/services/invitationService.ts (invitation CRUD)
- src/services/relationshipReviewService.ts (review CRUD)

UI Patterns:
- src/screens/ProfileScreen.tsx (relationship buttons)
- src/screens/PublicProfileScreen.tsx (relationship actions)
- src/screens/UsersScreen.tsx (user list buttons)
- src/screens/NotificationsScreen.tsx (notification handling)
- src/components/UsersList.tsx (compact user actions)

Database:
- supabase/migrations/20250112_pending_invitations.sql
- supabase/migrations/20250113_enhance_invitation_system_safe.sql
```

### **Web Project Target Files**
```
Implementation Targets:
- src/components/dialogs/ProfileDialog.tsx (add Supervisors tab)
- src/components/UserListModal.tsx:180:14 (add relationship buttons)
- src/components/dialogs/PublicProfileDialog.tsx (add relationship actions)
- src/components/NotificationBell.tsx (add relationship notifications)

New Components to Create:
- src/components/RelationshipManagementPanel.tsx
- src/components/RelationshipReviewSection.tsx  
- src/components/RelationshipReviewModal.tsx
- src/services/relationshipService.ts
- src/hooks/useRelationships.ts
```

---

## 🚀 **Quick Start Checklist**

### **Week 1: Foundation**
- [ ] Port invitation service functions to web
- [ ] Set up Supabase client with same configuration
- [ ] Test database connectivity and RLS policies
- [ ] Create basic relationship hooks (useRelationships, useInvitations)

### **Week 2: Core Components** 
- [ ] Create RelationshipManagementPanel with 4 tabs
- [ ] Create RelationshipReviewSection with rating system
- [ ] Create RelationshipReviewModal for removal flow
- [ ] Test invitation send/accept/reject flows

### **Week 3: Integration**
- [ ] Add Supervisors tab to ProfileDialog
- [ ] Add relationship buttons to UserListModal  
- [ ] Add relationship actions to PublicProfileDialog
- [ ] Test end-to-end user flows

### **Week 4: Notifications**
- [ ] Enhance NotificationBell with relationship types
- [ ] Add Accept/Reject buttons in notifications
- [ ] Implement real-time updates
- [ ] Test notification flows and cleanup

### **Week 5: Polish & Testing**
- [ ] Add loading states and error handling
- [ ] Implement review back functionality
- [ ] Add admin moderation features
- [ ] Full end-to-end testing with multiple users

---

## 💡 **Pro Tips**

1. **Start Small**: Implement basic invitation flow first, then add reviews and advanced features
2. **Reuse Logic**: Copy-paste mobile service functions and adapt for web (minimal changes needed)
3. **Real-time First**: Set up Supabase subscriptions early to avoid manual refresh issues
4. **Test Bidirectionally**: Always test both student→supervisor and supervisor→student flows
5. **Handle Edge Cases**: Test with existing relationships, duplicate invitations, and network errors
6. **Mobile Parity**: Keep UI patterns consistent with mobile app for user familiarity

---

## 🎯 **Final Notes**

This system is **production-ready** on mobile with comprehensive error handling, real-time updates, and bidirectional relationship management. The web implementation should maintain the same level of robustness while adapting to web UI patterns.

**Key Success Factor**: The mobile app's strength is its real-time nature - users never need to manually refresh to see invitation updates. Maintain this in the web implementation for the best user experience.

**Database Ready**: All required tables, functions, and triggers exist. No new SQL needed - just connect and use the existing schema.

**MVP Focus**: Start with basic invitation flows, then add review system, then polish with real-time updates and advanced features.
