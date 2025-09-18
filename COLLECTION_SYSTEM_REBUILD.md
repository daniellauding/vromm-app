# Collection System Rebuild & Invitation System

## 🧹 **Step 1: Flush and Rebuild Database**

Run the SQL script to clean up and rebuild the collection system:

```sql
-- Execute this in your Supabase SQL editor:
-- Copy and paste the contents of flush_collections_and_rebuild.sql
```

This will:
- ✅ Delete all existing collections, members, and invitations
- ✅ Create the `collection_invitations` table with proper RLS policies
- ✅ Create test collections and invitations
- ✅ Set up automatic triggers for invitation acceptance

## 🔧 **Step 2: Code Changes Applied**

### **FilterSheet.tsx**
- ✅ Fixed collection filtering logic to show member collections
- ✅ Now includes collections where user is a member (regardless of route count)

### **useUserCollections.ts**
- ✅ Added `member_role` field to interface
- ✅ Updated query to fetch member role information
- ✅ Include role data when processing member collections

### **New Components Created**

#### **CollectionInvitationModal.tsx**
- ✅ Modal for accepting/declining/archiving invitations
- ✅ Similar to instructor/student relationship modals
- ✅ Automatic collection refresh after actions

#### **useCollectionInvitations.ts**
- ✅ Hook to manage collection invitations
- ✅ Real-time updates for invitation changes
- ✅ Automatic refresh when invitations are handled

## 🎯 **Step 3: Test the System**

### **1. Run the SQL Script**
```sql
-- Execute flush_collections_and_rebuild.sql in Supabase
```

### **2. Test the App**
1. **Open the app** and go to the map
2. **Open FilterSheet** - you should see the test collections
3. **Check console logs** for `[useUserCollections]` and `[useCollectionInvitations]`

### **3. Test Invitations**
1. **Create a new collection** in the app
2. **Invite another user** (if you have multiple test users)
3. **Check if invitation modal appears** for the invited user
4. **Accept/decline invitation** and verify collection access

## 🔍 **Expected Results**

### **Before Fix:**
- ❌ "Bjuder in till kartan" not visible in FilterSheet
- ❌ No invitation system
- ❌ Member collections filtered out

### **After Fix:**
- ✅ All member collections visible in FilterSheet
- ✅ Invitation system with accept/decline modals
- ✅ Real-time updates for invitation changes
- ✅ Automatic collection refresh after actions

## 🚨 **Troubleshooting**

### **If collections still don't show:**
1. **Check console logs** for `[useUserCollections]` messages
2. **Verify user ID** matches in database
3. **Check if collections have proper member relationships**

### **If invitations don't work:**
1. **Verify `collection_invitations` table exists**
2. **Check RLS policies** are working
3. **Test with multiple user accounts**

### **If FilterSheet still filters out collections:**
1. **Check the filtering logic** in FilterSheet.tsx lines 1080-1087
2. **Verify `member_role` field** is being set correctly
3. **Check console logs** for collection data

## 📋 **Next Steps**

1. **Run the SQL script** to rebuild the system
2. **Test the app** to see if collections appear
3. **Test invitation flow** with multiple users
4. **Verify FilterSheet** shows all accessible collections

The system should now work like the instructor/student relationship system with proper invitation handling! 🎉
