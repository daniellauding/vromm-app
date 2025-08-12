# 🚀 Enhanced Invitation System - Deployment Guide

## Prerequisites Checklist
- [ ] Supabase project set up
- [ ] Database access (via Dashboard or CLI)
- [ ] Admin access to Supabase Dashboard
- [ ] App built and ready for testing

## Deployment Steps

### 1. 🗄️ Database Setup

#### Apply Migration
**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250112_pending_invitations.sql`
3. Execute the SQL
4. Verify tables created: `pending_invitations`

**Option B: Via CLI (if Docker available)**
```bash
supabase start
supabase db push
```

### 2. 📧 Deploy Edge Function

```bash
# Deploy the invitation function
supabase functions deploy send-invitation

# Set required environment variables
supabase secrets set SITE_URL=https://your-app-domain.com
```

### 3. ⚙️ Configure Email Templates

1. **Go to Supabase Dashboard → Authentication → Email Templates**
2. **Edit "Invite user" template**
3. **Use this template:**

```html
<h2>You've been invited to join VROMM! 🚗</h2>

<p>Hi there!</p>

<p>You've been invited by <strong>{{ .Data.supervisorName }}</strong> to join VROMM as a {{ .Data.role }}.</p>

<p>VROMM is a comprehensive driving learning platform where you can:</p>
<ul>
  <li>📍 Learn driving routes and techniques</li>
  <li>📊 Track your progress</li>
  <li>👨‍🏫 Get guidance from supervisors</li>
  <li>🎯 Complete practical exercises</li>
</ul>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #00E6C3; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation & Sign Up</a></p>

<p>This invitation will expire in 30 days.</p>

<p>If you have any questions, please contact your supervisor: <strong>{{ .Data.supervisorName }}</strong></p>

<hr>
<p><small>This invitation was sent through VROMM. If you didn't expect this invitation, you can safely ignore this email.</small></p>
```

### 4. 🔒 Set Up Row Level Security

The migration already includes RLS policies, but verify they're active:

1. **Go to Supabase Dashboard → Database → Tables → pending_invitations**
2. **Check "Row Level Security" is enabled**
3. **Verify policies exist:**
   - Users can view own invitations
   - Users can view invitations to them
   - Users can create invitations
   - Users can update own invitations

### 5. 🏗️ Build and Deploy App

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Build for production
npm run build:all

# Or start development
npm start
```

## Testing Checklist

### 🧪 Basic Functionality
- [ ] App starts without errors
- [ ] ProfileScreen loads correctly
- [ ] Supervised Students section visible for instructors/admins

### 📨 Invitation Flow
- [ ] "Invite Students" button works
- [ ] Modal opens with correct options
- [ ] Can toggle between "Search Existing" and "Invite New"
- [ ] Email input fields work correctly
- [ ] Can add/remove multiple email addresses
- [ ] "Send Invitations" button functions

### 📧 Email Delivery
- [ ] Invitation emails are sent
- [ ] Email template renders correctly
- [ ] Confirmation URL works
- [ ] Signup page pre-fills email

### 🔄 Signup Process
- [ ] Invited user can sign up
- [ ] Account is created with correct role
- [ ] Supervisor relationship is established automatically
- [ ] Invitation status updates to 'accepted'

### 📊 Invitation Management
- [ ] Pending invitations display correctly
- [ ] Can resend invitations
- [ ] Can cancel pending invitations
- [ ] Invitation status tracking works

## Troubleshooting

### Common Issues

#### 1. **Emails Not Sending**
```sql
-- Check if edge function is deployed
SELECT * FROM pg_stat_user_functions WHERE funcname = 'send_user_invitation';

-- Check invitation records
SELECT * FROM pending_invitations ORDER BY created_at DESC LIMIT 5;
```

**Solutions:**
- Verify edge function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs send-invitation`
- Verify SMTP settings in Supabase Dashboard

#### 2. **Trigger Not Working**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created_invitation';

-- Check trigger function
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user_invitation';
```

**Solutions:**
- Re-run the trigger creation part of migration
- Check auth.users table has INSERT permissions

#### 3. **Relationships Not Created**
```sql
-- Check student_supervisor_relationships table
SELECT * FROM student_supervisor_relationships ORDER BY created_at DESC LIMIT 5;

-- Check for constraint issues
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'student_supervisor_relationships'::regclass;
```

**Solutions:**
- Verify foreign key constraints are correct
- Check if profiles exist for both supervisor and student

#### 4. **Role Not Set**
```sql
-- Check user roles after signup
SELECT id, email, role FROM profiles WHERE email = 'test@example.com';

-- Check pending invitations
SELECT * FROM pending_invitations WHERE email = 'test@example.com';
```

**Solutions:**
- Verify user_role enum includes expected values
- Check if trigger has UPDATE permissions on profiles

### Debug Queries

```sql
-- View all pending invitations with supervisor info
SELECT 
  pi.*,
  p.full_name as supervisor_name,
  p.email as supervisor_email
FROM pending_invitations pi
LEFT JOIN profiles p ON pi.invited_by = p.id
ORDER BY pi.created_at DESC;

-- Check recent signups with invitations
SELECT 
  u.email,
  u.created_at,
  p.role,
  pi.status as invitation_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN pending_invitations pi ON LOWER(u.email) = LOWER(pi.email)
WHERE u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC;

-- View supervisor relationships
SELECT 
  ssr.*,
  s.full_name as student_name,
  s.email as student_email,
  sup.full_name as supervisor_name,
  sup.email as supervisor_email
FROM student_supervisor_relationships ssr
JOIN profiles s ON ssr.student_id = s.id
JOIN profiles sup ON ssr.supervisor_id = sup.id
ORDER BY ssr.created_at DESC;
```

## Production Considerations

### Performance
- [ ] Add indexes on frequently queried columns
- [ ] Monitor invitation volume and rate limits
- [ ] Set up email delivery monitoring

### Security
- [ ] Review RLS policies
- [ ] Audit user permissions
- [ ] Monitor for invitation abuse

### Monitoring
- [ ] Set up alerts for failed invitations
- [ ] Track invitation acceptance rates
- [ ] Monitor edge function performance

### Maintenance
- [ ] Set up periodic cleanup of expired invitations
- [ ] Plan for email template updates
- [ ] Document operational procedures

## Success Metrics

After deployment, monitor these metrics:
- **Invitation delivery rate** (should be >95%)
- **Acceptance rate** (target >70%)
- **Time to acceptance** (average <24 hours)
- **Error rate** (should be <5%)
- **User satisfaction** with invitation process

## Next Steps

After successful deployment:
1. **User Training** - Create guides for supervisors
2. **Feedback Collection** - Gather user feedback on the process
3. **Iteration** - Improve based on usage patterns
4. **Scale Planning** - Prepare for increased invitation volume
5. **Feature Enhancement** - Plan additional features like bulk CSV import

---

🎉 **Congratulations!** Your enhanced invitation system is now ready to onboard students efficiently and automatically establish supervisor relationships!