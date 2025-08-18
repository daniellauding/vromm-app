# Enhanced Invitation System

## Overview

This implementation extends the existing invitation flow to support creating new user accounts with automatic supervisor relationships. We've enhanced the system to support multi-email invitations, role assignment, and automatic relationship creation.

## Key Features

### 1. **Multiple Email Invitations**
- Supervisors can invite multiple students by entering email addresses directly
- Support for bulk invitations with rate limiting
- Email validation and duplicate checking

### 2. **Automatic Account Creation**
- Uses Supabase's built-in `auth.inviteUserByEmail()` functionality
- New users receive the standard Supabase invitation email
- Custom email template can be configured in Supabase dashboard

### 3. **Role Assignment**
- Default role assignment (student/instructor) during invitation
- Automatic role setting when user accepts invitation
- Role-based UI and permissions

### 4. **Supervisor Relationships**
- Automatic creation of student-supervisor relationships
- Relationships created when user accepts invitation via database trigger
- No manual linking required

### 5. **Invitation Status Tracking**
- Track pending, accepted, rejected, cancelled, and expired invitations
- Resend capability for pending invitations
- Cancel pending invitations

## Implementation Details

### Files Created/Modified

#### 1. **InvitationService** (`src/services/invitationService.ts`)
```typescript
// Core functions
- inviteNewUser(data: InvitationData)
- inviteMultipleUsers(emails: string[], role, supervisorId, supervisorName)
- checkPendingInvitation(email: string)
- getPendingInvitations(userId: string)
- cancelInvitation(invitationId: string)
- acceptInvitation(email: string, userId: string)
- resendInvitation(invitationId: string)
```

#### 2. **Database Migration** (`supabase/migrations/20250112_pending_invitations.sql`)
- `pending_invitations` table with RLS policies
- `send_user_invitation()` function
- `handle_new_user_invitation()` trigger function
- Automatic invitation acceptance on user signup

#### 3. **Enhanced ProfileScreen** (`src/screens/ProfileScreen.tsx`)
- Multi-email input UI
- Toggle between "Search Existing" and "Invite New" modes
- Pending invitations management
- Bulk invitation handling

#### 4. **Database Types** (`src/lib/database.types.ts`)
- Added `pending_invitations` table types
- Proper TypeScript support for new fields

## Database Schema

### `pending_invitations` Table
```sql
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role DEFAULT 'student',
  invited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- pending|accepted|rejected|cancelled|expired
  metadata JSONB DEFAULT '{}',
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## User Flow

### 1. **Supervisor Invites Student**
1. Supervisor opens ProfileScreen → Supervised Students section
2. Clicks "Invite Students" 
3. Toggles to "Invite New" mode
4. Enters multiple email addresses
5. Clicks "Send X Invitation(s)"
6. System creates pending invitation records
7. Supabase sends invitation emails

### 2. **Student Receives Invitation**
1. Student receives email with invitation link
2. Clicks "Accept the invite" link
3. Redirected to signup form with pre-filled email
4. Completes signup process
5. Database trigger automatically:
   - Accepts the pending invitation
   - Creates supervisor relationship
   - Sets user role to 'student'

### 3. **Invitation Management**
1. Supervisor can view pending invitations
2. Resend invitations if needed
3. Cancel pending invitations
4. Track invitation status

## Security Features

### Row Level Security (RLS)
- Users can only see invitations they sent
- Users can see invitations sent to their email
- Proper foreign key constraints

### Rate Limiting
- Bulk invitations processed in batches of 5
- 1-second delay between batches to prevent spam

### Email Validation
- Server-side email format validation
- Duplicate invitation checking

## Supabase Configuration

### Email Templates
The system uses Supabase's built-in invitation email template. You can customize it in:
1. Supabase Dashboard → Authentication → Email Templates
2. Edit the "Invite user" template
3. Use variables like `{{ .ConfirmationURL }}` and `{{ .SiteURL }}`

### Required Functions
The migration creates these database functions:
- `send_user_invitation()` - Creates invitation records
- `handle_new_user_invitation()` - Auto-accepts invitations on signup
- `expire_old_invitations()` - Cleanup function for old invitations

## Usage Examples

### Invite Single Student
```typescript
await inviteNewUser({
  email: 'student@example.com',
  role: 'student',
  supervisorId: 'supervisor-uuid',
  supervisorName: 'John Supervisor'
});
```

### Invite Multiple Students
```typescript
await inviteMultipleUsers(
  ['student1@example.com', 'student2@example.com'],
  'student',
  'supervisor-uuid',
  'John Supervisor'
);
```

### Check Pending Invitations
```typescript
const pending = await getPendingInvitations('supervisor-uuid');
```

## Future Enhancements

### Possible Improvements
1. **Custom Email Templates** - HTML email templates with branding
2. **Invitation Expiry** - Automatic expiration after X days
3. **Bulk Import** - CSV file upload for mass invitations
4. **Role Permissions** - More granular role-based permissions
5. **Invitation Analytics** - Track acceptance rates and engagement

### Integration Points
- Push notifications for invitation status changes
- Slack/Teams integration for team invitations
- SCIM provisioning for enterprise accounts
- SSO integration for automatic role assignment

## Testing

Run the test utility to verify functionality:
```typescript
import { testInvitationFlow } from '../utils/testInvitations';
await testInvitationFlow();
```

## Deployment Notes

1. **Run Migration**: Apply the database migration first
2. **Update Types**: Regenerate database types if needed
3. **Configure Email**: Set up custom email templates in Supabase
4. **Test Flow**: Verify invitation emails are being sent
5. **Monitor**: Check invitation acceptance rates

## Troubleshooting

### Common Issues
1. **Emails not sending**: Check Supabase email configuration
2. **Relationships not created**: Verify trigger is active
3. **Role not set**: Check user_role enum values
4. **Permissions denied**: Verify RLS policies

### Debug Steps
1. Check `pending_invitations` table for records
2. Verify Supabase auth logs
3. Test with known email addresses
4. Check network requests in browser dev tools

This implementation provides a complete, production-ready invitation system that extends the existing VROMM architecture while maintaining security and usability.