# User Management & Email Fix Guide 🚀

## 🎯 ONE-TIME SETUP (Run This First!)

Before using any other scripts, run this once:

### **RUN_ME_FIRST.sql**
Fixes all database triggers and creates the safe deletion function.

**Steps:**
1. Open `RUN_ME_FIRST.sql` in Supabase SQL Editor
2. Click **RUN** (no changes needed!)
3. ✅ All triggers fixed
4. ✅ `safe_delete_user()` function ready

---

## Problem 1: Cannot Re-register with Deleted User Email ❌

**Error:** `Database error finding user` when trying to sign up with an email from a deleted user.

**Solution:** Use `CHECK_AND_FIX_EMAIL.sql` - **FULLY AUTOMATIC!**

### Steps:
1. Open `CHECK_AND_FIX_EMAIL.sql` in Supabase SQL Editor
2. Click **RUN** (no manual replacement needed!)
3. Script automatically finds and frees ALL blocked emails:
   - `daniel+1337@lauding.se` ✅
   - `daniel+testflight@lauding.se` ✅
   - All other deleted user emails ✅
4. Emails are now free for re-registration! 🎉

**Sample Output:**
```
🔍 SCANNING FOR ORPHANED RECORDS...
🗑️ Deleting orphaned auth record: daniel+1337@lauding.se
   ✅ Email freed: daniel+1337@lauding.se

✅ AUTOMATIC CLEANUP COMPLETE!
Orphaned auth records deleted: 1
Total emails freed: 1
```

---

## Problem 2: Change User Email & Disconnect Social Providers 🔄

**Solution:** Use `CHANGE_USER_EMAIL_AND_DISCONNECT_SOCIAL.sql`

### Steps:
1. Open `CHANGE_USER_EMAIL_AND_DISCONNECT_SOCIAL.sql`
2. Replace `'5ee16b4f-5ef9-41bd-b571-a9dc895027c1'` with the user ID
3. Replace `'NEW_EMAIL@example.com'` with the new email address
4. Run the script
5. Result:
   - ✅ Facebook login disconnected
   - ✅ Google login disconnected  
   - ✅ Apple login disconnected
   - ✅ Email changed in both `auth.users` and `profiles`
   - ⚠️ **User must set a new password** using "Reset Password" with the new email

---

## Problem 3: Delete Multiple Test Users at Once 🗑️

**Solution:** Use `DELETE_MULTIPLE_USERS.sql`

### Steps:
1. Open `DELETE_MULTIPLE_USERS.sql`
2. The user IDs are already filled in (49 test users)
3. Click **RUN**
4. All test users deleted with data preserved! ✅

### What gets deleted:
- ✅ User accounts from `auth.users` and `profiles`

### What gets PRESERVED:
- ✅ **Routes** (creator_id becomes NULL)
- ✅ **Reports** (reporter_id becomes NULL)
- ✅ **All Stats** (driven_routes, exercises, sessions, reviews)
- ✅ **Learning Progress** (completions, virtual repeats)

---

## Problem 4: Admin Panel User Deletion 🖥️

**✅ FIXED!** The admin panel (`vromm-admin/UsersList.tsx`) now uses `safe_delete_user()`.

### Works for:
- **Single user deletion:** Dropdown menu → Delete User
- **Bulk deletion:** Select multiple → Bulk Actions → Delete Selected

### What happens:
- User account removed
- Routes, stats, and reports preserved
- Email freed for re-registration

---

## Quick Reference Table

| Order | File | Purpose | Manual Changes? |
|-------|------|---------|----------------|
| **1** | `RUN_ME_FIRST.sql` | Fix all triggers (run once) | ❌ No |
| 2 | `CHECK_AND_FIX_EMAIL.sql` | Free up blocked emails | ❌ No (automatic!) |
| 3 | `DELETE_MULTIPLE_USERS.sql` | Delete 49 test users | ❌ No (pre-filled) |
| 4 | `CHANGE_USER_EMAIL_AND_DISCONNECT_SOCIAL.sql` | Change email & disconnect social | ✅ Yes (user ID + email) |
| 5 | Admin Panel (UsersList.tsx) | Delete from UI | ❌ No (code updated) |

---

## Important Notes

⚠️ **First Time?** Run `RUN_ME_FIRST.sql` before anything else!

⚠️ **After changing email:** User must reset their password using the new email.

✅ **Safe deletion:** All deletions preserve routes, reports, and statistics for analytics.

🔒 **Social providers:** When disconnected, user can only log in with email/password.

🎉 **No manual work:** Most scripts are fully automatic - just click RUN!

---

## Troubleshooting

### Error: `record "new" has no field "updated_at"`
**Solution:** Run `RUN_ME_FIRST.sql` again to fix all triggers.

### Error: `Database error finding user` on signup
**Solution:** Run `CHECK_AND_FIX_EMAIL.sql` to free up the email.

### Admin panel deletion fails
**Solution:** Make sure `safe_user_deletion.sql` or `RUN_ME_FIRST.sql` has been run.

