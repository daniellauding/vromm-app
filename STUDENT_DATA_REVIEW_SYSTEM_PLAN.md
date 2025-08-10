# Student Data Review System - Implementation Plan

## Overview

This document outlines the implementation plan for a comprehensive student data review system with completion tracking and admin privileges for the VROMM application.

## Current System Analysis

### Existing Database Structure
The current system provides excellent foundations:
- `profiles` table with role-based access (`student`, `instructor`, `admin`, `school`)
- `student_progress` table for tracking completion status  
- `school_memberships` for school-based organization
- Role enum: `user_role: 'student' | 'school' | 'instructor' | 'admin'`

### Key Files Analyzed
- `src/lib/database.types.ts` - Database schema definitions
- `src/context/AuthContext.tsx` - Authentication and user management

## Database Schema Enhancements

### New Completion Status Enum
```sql
-- Add completion status enum
CREATE TYPE completion_status AS ENUM ('not_started', 'in_progress', 'completed', 'verified');
```

### Enhanced Student Progress Table
```sql
-- Enhance student_progress table
ALTER TABLE student_progress 
ADD COLUMN completion_status completion_status DEFAULT 'not_started',
ADD COLUMN admin_verified boolean DEFAULT false,
ADD COLUMN verified_by uuid REFERENCES profiles(id),
ADD COLUMN verified_at timestamp,
ADD COLUMN metadata jsonb DEFAULT '{}';
```

### Audit Trail Implementation
```sql
-- Add student data audit trail
CREATE TABLE student_progress_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id uuid REFERENCES student_progress(id),
  changed_by uuid REFERENCES profiles(id),
  old_status completion_status,
  new_status completion_status,
  admin_override boolean DEFAULT false,
  notes text,
  created_at timestamp DEFAULT now()
);
```

## Core Features

### 0. Core Data Switching (SIMPLE FIRST DRAFT) ✅
Simple user/student switching functionality allowing admin/supervisor/school/teacher to view HomeScreen and ProgressSection with active user's data instead of their own.

#### Implementation Approach:
- **Add `activeUserId` prop** to screens (HomeScreen, ProgressSection)
- **No UI/UX changes** - reuse existing components
- **Context-based switching** - use existing supervised students selector

#### Code Draft:
```typescript
// Add to AuthContext or create new StudentSwitchContext
interface StudentSwitchContextType {
  activeStudentId: string | null;
  setActiveStudentId: (id: string | null) => void;
  getEffectiveUserId: () => string; // Returns activeStudentId || currentUser.id
}

// Update HomeScreen.tsx
interface HomeScreenProps {
  activeUserId?: string;
}

// Update ProgressSection.tsx  
interface ProgressSectionProps {
  activeUserId?: string;
}

// Existing supervised students controls enhanced:
<Text size="lg" weight="bold" color="$color">
  Supervised Students
</Text>
<XStack gap="$2">
  <Button
    size="sm"
    variant="secondary"
    backgroundColor="$green9"
    onPress={() => {
      fetchSupervisedStudents();
      setShowStudentSelector(true);
    }}
  >
    <Text color="white">
      {activeStudentId ? 'Switch Student' : 'Select Student'}
    </Text>
  </Button>
  <Button
    size="sm"
    variant="secondary"
    backgroundColor="$blue9"
    onPress={() => {
      setInviteType('student');
      setShowInviteModal(true);
    }}
  >
    <Text color="white">Invite Students</Text>
  </Button>
  {/* ADD: Mark exercises complete for active user */}
  {activeStudentId && (
    <Button
      size="sm"
      variant="secondary"
      backgroundColor="$orange9"
      onPress={() => setShowProgressControls(true)}
    >
      <Text color="white">Mark Progress</Text>
    </Button>
  )}
</XStack>
```

#### Key Changes:
1. **Data Fetching**: Use `activeUserId || currentUser.id` in progress queries
2. **Context Switching**: Maintain selected student state across screens
3. **Progress Controls**: Add ability to mark exercises complete for selected student
4. **Minimal Changes**: Reuse existing UI components and layouts

### 1. Student Data Dashboard
- **List View**: Display all students with filtering by school, completion status, date ranges
- **Search**: By name, email, school, route progress
- **Bulk Actions**: Mark multiple students as complete/in-progress (admin only)
- **Export**: CSV/Excel export of student progress data

### 2. Completion Status System
- **Status Flow**: `not_started` → `in_progress` → `completed` → `verified`
- **Auto-progression**: Student actions move status forward automatically
- **Admin Override**: Admins can set any status without student verification
- **Verification System**: Admins can verify completed work

### 3. Role-Based Access Control
- **Students**: Can only view their own progress, mark items in-progress/completed
- **Instructors**: Can view/modify students in their school, verify completions
- **Admins**: Full access, can override any status, bulk operations, exports
- **School**: Can manage their enrolled students

### 4. Admin Privilege System
```typescript
// Admin bypass verification example
const updateStudentProgress = async (
  progressId: string, 
  status: completion_status, 
  adminOverride = false
) => {
  if (adminOverride && !isAdmin(currentUser)) {
    throw new Error('Insufficient permissions for admin override');
  }
  
  // Admin can set any status directly
  // Students require verification for 'completed' → 'verified' transition
}
```

## UI Components Architecture

### Main Dashboard Structure
```
StudentDataDashboard/
├── StudentList.tsx           # Main data grid with virtual scrolling
├── FilterPanel.tsx          # Search & filter controls  
├── BulkActionBar.tsx        # Bulk operations (admin only)
├── StudentDetailModal.tsx   # Individual student detailed view
├── ExportDialog.tsx         # Data export options
├── StatusUpdateModal.tsx    # Status change with notes
└── hooks/
    ├── useStudentData.ts    # Data fetching & caching
    ├── useFilters.ts        # Filter state management
    ├── useBulkActions.ts    # Bulk operation logic
    └── usePermissions.ts    # Role-based access control
```

### Key Component Features
- **Responsive Design**: Optimized for mobile/tablet/desktop
- **Real-time Updates**: Live progress tracking via Supabase subscriptions
- **Offline Support**: Cache data for offline viewing
- **Performance**: Virtual scrolling for large student datasets
- **Accessibility**: WCAG compliant interface

## Implementation Phases

### Phase 1: Foundation (Easy Implementation)
1. ✅ Database schema enhancements
2. ✅ Basic student list view component
3. ✅ Simple completion status toggles
4. ✅ Role-based UI visibility

**Estimated Time**: 1-2 weeks

### Phase 2: Core Features
5. ✅ Advanced filtering & search functionality
6. ✅ Admin override functionality  
7. ✅ Student detail modals
8. ✅ Audit trail implementation

**Estimated Time**: 2-3 weeks

### Phase 3: Advanced Features
9. ✅ Bulk operations interface
10. ✅ Data export functionality
11. ✅ Real-time notifications
12. ✅ Performance optimizations

**Estimated Time**: 2-3 weeks

## Security & Permission Model

### Permission Hierarchy
```typescript
// Permission checking functions
const canViewStudent = (viewer: Profile, student: Profile) => {
  if (viewer.role === 'admin') return true;
  if (viewer.id === student.id) return true; // Own data
  if (viewer.role === 'instructor' && sharesSameSchool(viewer, student)) return true;
  return false;
};

const canModifyProgress = (modifier: Profile, student: Profile) => {
  if (modifier.role === 'admin') return true; // Admin bypass
  if (modifier.role === 'instructor' && sharesSameSchool(modifier, student)) return true;
  return false;
};

const canBulkUpdate = (user: Profile) => {
  return user.role === 'admin' || user.role === 'instructor';
};
```

### Data Security
- Row Level Security (RLS) policies in Supabase
- API rate limiting for bulk operations
- Audit logging for all admin actions
- Data encryption at rest and in transit

## Technical Specifications

### Frontend Stack
- **Framework**: React Native + TypeScript
- **UI Library**: Tamagui (already in use)
- **State Management**: React Context + Hooks
- **Data Fetching**: Supabase client with real-time subscriptions

### Backend Requirements
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage (for exports)
- **Real-time**: Supabase Realtime subscriptions

### Performance Considerations
- Virtual scrolling for large student lists
- Debounced search queries
- Paginated data loading
- Cached user permissions
- Optimistic UI updates

## Data Export Features

### Export Formats
- **CSV**: Basic student progress data
- **Excel**: Formatted reports with charts
- **PDF**: Printable progress reports
- **JSON**: Raw data for integrations

### Export Options
- **Filtered Data**: Export only filtered/searched results
- **Date Ranges**: Progress within specific timeframes
- **School-specific**: Data for specific schools only
- **Custom Fields**: Select specific data columns

## Monitoring & Analytics

### Progress Tracking
- Completion rate dashboards
- Student engagement metrics
- Instructor workload analysis
- School performance comparisons

### System Health
- API response times
- Database query performance
- User activity patterns
- Error rate monitoring

## Migration Strategy

### Database Migration
1. Create new tables and columns
2. Migrate existing `student_progress` data
3. Set up audit triggers
4. Create indexes for performance

### Feature Rollout
1. **Beta Phase**: Limited user group testing
2. **School Pilot**: Single school implementation
3. **Gradual Rollout**: Region-by-region deployment
4. **Full Release**: Complete system activation

## Success Metrics

### User Experience
- Reduced time to review student progress
- Increased admin efficiency
- Higher completion tracking accuracy
- Improved student engagement

### Technical Performance
- Sub-second search response times
- 99.9% system uptime
- Zero data loss incidents
- Scalability to 10,000+ students

## Conclusion

This student data review system provides:
- **Easy initial implementation** leveraging existing infrastructure
- **Scalable architecture** that grows with organizational needs  
- **Admin efficiency** through bulk operations and override capabilities
- **Student autonomy** while maintaining proper oversight
- **Audit compliance** with complete change tracking
- **Mobile-first design** for universal accessibility

The existing VROMM codebase with Supabase, React Native, and TypeScript provides excellent foundations for this implementation.

---

**Document Version**: 1.0  
**Created**: 2025-01-09  
**Last Updated**: 2025-01-09  
**Author**: Claude Code Assistant