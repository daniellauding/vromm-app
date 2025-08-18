# Debugging Commands for Invitation System Issues

## 1. Check Deleted User Status

### Supabase SQL Editor Commands:

```sql
-- Check current user with account_status = 'deleted'
SELECT id, email, full_name, account_status, created_at, updated_at 
FROM profiles 
WHERE account_status = 'deleted';

-- Check if user '90311cc2-0451-44f4-a5ed-a54d484603fe' exists and status
SELECT id, email, full_name, account_status, role, created_at, updated_at 
FROM profiles 
WHERE id = '90311cc2-0451-44f4-a5ed-a54d484603fe';

-- Check auth.users table for the same user
SELECT id, email, created_at, updated_at, email_confirmed_at, deleted_at
FROM auth.users 
WHERE id = '90311cc2-0451-44f4-a5ed-a54d484603fe';
```

## 2. Check Notifications Table Structure

```sql
-- Check current notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if notifications table has 'data' column
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'notifications' 
  AND column_name = 'data'
  AND table_schema = 'public'
);
```

## 3. Check Invitation System Data

```sql
-- Check pending_invitations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing invitations for daniel@lauding.se
SELECT id, email, role, status, invited_by, created_at, updated_at
FROM pending_invitations 
WHERE email = 'daniel@lauding.se';

-- Check if user already exists in profiles
SELECT id, email, full_name, role, account_status
FROM profiles 
WHERE email IN ('daniel@lauding.se', 'daniel+bjudainlite@lauding.se');

-- Check if user exists in auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email IN ('daniel@lauding.se', 'daniel+bjudainlite@lauding.se');
```

## 4. Check User Creation Function

```sql
-- Check if the SQL function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'create_invited_user_with_password';

-- Check if pgcrypto extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';

-- Test the function manually (replace with actual values)
SELECT create_invited_user_with_password(
  'test@example.com',
  'testpassword123',
  'Test User',
  'student'::user_role,
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa'::uuid
);
```

## 5. Check Student-Supervisor Relationships

```sql
-- Check existing relationships for the users mentioned
SELECT 
  ssr.*,
  s.full_name as student_name,
  sup.full_name as supervisor_name
FROM student_supervisor_relationships ssr
LEFT JOIN profiles s ON s.id = ssr.student_id
LEFT JOIN profiles sup ON sup.id = ssr.supervisor_id
WHERE ssr.student_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
   OR ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa';

-- Check user roles
SELECT id, email, full_name, role 
FROM profiles 
WHERE id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', '5ee16b4f-5ef9-41bd-b571-a9dc895027c1');
```

## 6. Check RLS Policies

```sql
-- Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check RLS policies on notifications table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';
```

## Console Log Analysis

Based on your logs, here are the issues identified:

### Issue 1: Deleted User Can Still Login
- User `90311cc2-0451-44f4-a5ed-a54d484603fe` has `account_status = 'deleted'` but can still authenticate
- The RLS policy is not properly blocking deleted users from accessing the app

### Issue 2: Missing 'data' Column in Notifications
- Error: `column "data" of relation "notifications" does not exist`
- The notifications table is missing the `data` JSONB column

### Issue 3: Duplicate Key Violations
- Users already exist but system tries to create them again
- Need better duplicate checking logic

### Issue 4: Invitation System Confusion
- System tries to create new users when inviting existing users
- Need to distinguish between "invite existing user" vs "create new user and invite"
