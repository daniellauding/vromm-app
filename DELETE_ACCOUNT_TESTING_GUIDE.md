# 🗑️ Delete Account Testing Guide

## 📋 Overview
This guide covers all delete account functionality for testers. The delete account system allows users to selectively delete their data while preserving or transferring public content.

---

## 🎯 Test Scenarios Summary

| **Test Scenario** | **What Gets Deleted** | **What Gets Preserved** | **Expected Result** |
|-------------------|----------------------|-------------------------|-------------------|
| **Delete Private Routes Only** | Private routes | Public routes, events, exercises, reviews, comments | User account deleted, private routes gone, public content remains |
| **Delete Public Routes Only** | Public routes | Private routes, events, exercises, reviews, comments | User account deleted, public routes gone, private content remains |
| **Delete Events Only** | User events | Routes, exercises, reviews, comments | User account deleted, events gone, other content remains |
| **Delete Exercises Only** | Learning progress | Routes, events, reviews, comments | User account deleted, progress reset, other content remains |
| **Delete Reviews Only** | User reviews | Routes, events, exercises, comments | User account deleted, reviews gone, other content remains |
| **Delete Comments Only** | ❌ Not Supported | Routes, events, exercises, reviews | Comments deletion not implemented in database function |
| **Transfer Public Content** | User account | Public routes → System account | User account deleted, public routes transferred to system |
| **Nuclear Delete (All On)** | Everything | Nothing | User account + all data deleted |
| **Selective Delete** | Chosen items | Unchosen items | User account deleted, only selected data removed |

---

## 🔧 Delete Options Breakdown

### **Route Management**
| **Option** | **Toggle** | **What It Does** | **Database Impact** |
|------------|------------|------------------|-------------------|
| **Delete Private Routes** | `optDeletePrivate` | Removes user's private routes | Deletes from `routes` table where `is_public = false` |
| **Delete Public Routes** | `optDeletePublic` | Removes user's public routes | Deletes from `routes` table where `is_public = true` |
| **Transfer Public Content** | `optTransferPublic` | Moves public routes to system account | Updates `creator_id` to system profile UUID |

### **Content Management**
| **Option** | **Toggle** | **What It Does** | **Database Impact** |
|------------|------------|------------------|-------------------|
| **Delete Events** | `optDeleteEvents` | Removes user's events | Deletes from `events` table |
| **Delete Exercises** | `optDeleteExercises` | Removes learning progress | Deletes from `learning_path_exercise_completions` |
| **Delete Reviews** | `optDeleteReviews` | Removes user reviews | Deletes from `reviews` table |
| **Delete Comments** | ❌ Not Supported | Comments deletion not implemented | Database function doesn't support comments deletion |

---

## 🧪 Step-by-Step Testing Process

### **1. Access Delete Account**
- [ ] Go to Profile Screen
- [ ] Scroll to Settings section
- [ ] Tap "Delete Account" button
- [ ] Verify modal opens with animated backdrop

### **2. Test Modal UI**
- [ ] Verify title shows "Delete Account"
- [ ] Verify description text is present
- [ ] Check all 5 toggle switches are visible (comments toggle removed)
- [ ] Verify "Transfer public content" toggle is ON by default
- [ ] Check Cancel and Delete buttons are present
- [ ] Verify Delete button is red/destructive styling

### **3. Test Toggle Functionality**
- [ ] Toggle each switch on/off
- [ ] Verify switches change color (blue when on, gray when off)
- [ ] Test "Transfer public content" toggle
- [ ] Verify help text appears below transfer toggle

### **4. Test Cancel Functionality**
- [ ] Tap Cancel button
- [ ] Verify modal closes with animation
- [ ] Verify no data is deleted
- [ ] Test backdrop tap to close modal

### **5. Test Delete Scenarios**

#### **Scenario A: Nuclear Delete (All Options ON)**
- [ ] Turn ON all delete toggles
- [ ] Turn OFF transfer toggle
- [ ] Tap Delete button
- [ ] Verify success toast appears
- [ ] Verify user is signed out
- [ ] Verify user cannot log back in (account_status = 'deleted')

#### **Scenario B: Selective Delete**
- [ ] Turn ON only "Delete Private Routes"
- [ ] Turn ON "Transfer Public Content"
- [ ] Tap Delete button
- [ ] Verify only private routes deleted
- [ ] Verify public routes transferred to system account
- [ ] Verify other content preserved

#### **Scenario C: Transfer Only**
- [ ] Turn OFF all delete toggles
- [ ] Turn ON "Transfer Public Content"
- [ ] Tap Delete button
- [ ] Verify public routes transferred to system account
- [ ] Verify all other content preserved

---

## 🗄️ Database Verification Queries

### **Check User Account Status**
```sql
SELECT id, full_name, email, account_status 
FROM profiles 
WHERE email = 'test@example.com';
```

### **Check Routes Deletion**
```sql
-- Should return 0 if private routes deleted
SELECT COUNT(*) FROM routes 
WHERE creator_id = 'user-uuid' AND is_public = false;

-- Should return 0 if public routes deleted
SELECT COUNT(*) FROM routes 
WHERE creator_id = 'user-uuid' AND is_public = true;
```

### **Check Content Deletion**
```sql
-- Check events
SELECT COUNT(*) FROM events WHERE creator_id = 'user-uuid';

-- Check exercises
SELECT COUNT(*) FROM learning_path_exercise_completions WHERE user_id = 'user-uuid';

-- Check reviews
SELECT COUNT(*) FROM reviews WHERE user_id = 'user-uuid';

-- Check comments
SELECT COUNT(*) FROM comments WHERE user_id = 'user-uuid';
```

### **Check Transfer to System Account**
```sql
-- Should show public routes now owned by system
SELECT COUNT(*) FROM routes 
WHERE creator_id = '22f2bccb-efb5-4f67-85fd-8078a25acebc';
```

---

## 🚨 Error Scenarios to Test

| **Error Scenario** | **Expected Behavior** | **Test Steps** |
|-------------------|----------------------|----------------|
| **Network Failure** | Error toast, modal stays open | Disconnect internet, try delete |
| **Database Error** | Error toast, modal stays open | Simulate DB error |
| **Invalid User** | Error toast, modal stays open | Test with invalid user ID |
| **RPC Function Failure** | Error toast, modal stays open | Simulate RPC error |

---

## ✅ Success Criteria

### **UI/UX Success**
- [ ] Modal opens with smooth animation
- [ ] All toggles work correctly
- [ ] Buttons have proper styling (red delete, gray cancel)
- [ ] Modal closes with animation
- [ ] Success toast appears on completion

### **Functional Success**
- [ ] Selected data is deleted
- [ ] Unselected data is preserved
- [ ] Public content transfers correctly when enabled
- [ ] User account status changes to 'deleted'
- [ ] User cannot log back in after deletion

### **Database Success**
- [ ] RPC function `process_user_account_deletion` executes successfully
- [ ] Only selected tables are affected
- [ ] System profile receives transferred content
- [ ] Account status prevents future logins

---

## 🔍 Troubleshooting

| **Issue** | **Possible Cause** | **Solution** |
|-----------|-------------------|--------------|
| Modal won't open | Animation refs missing | Check `showDeleteSheet()` function |
| Toggles not working | State not connected | Verify `useState` hooks |
| Delete button not red | Styling issue | Check `backgroundColor="$red9"` |
| Translation missing | Key not in database | Run translation SQL |
| RPC function fails | Database issue | Check function exists and parameters |

---

## 📱 Test on Different Devices

- [ ] **iOS**: Test modal animations and button styling
- [ ] **Android**: Test modal animations and button styling
- [ ] **Tablet**: Test modal sizing and layout
- [ ] **Small Screen**: Test scrolling and button accessibility

---

## 🎯 Priority Test Cases

### **High Priority**
1. **Nuclear Delete** - All options ON, transfer OFF
2. **Transfer Only** - All options OFF, transfer ON
3. **Selective Delete** - Mix of options ON/OFF
4. **Cancel Functionality** - Modal closes without deletion

### **Medium Priority**
5. **Individual Toggles** - Test each option separately
6. **Error Handling** - Network and database errors
7. **UI Responsiveness** - Different screen sizes

### **Low Priority**
8. **Edge Cases** - Invalid data, boundary conditions
9. **Performance** - Large amounts of data
10. **Accessibility** - Screen reader compatibility

---

**🎉 Happy Testing!** This comprehensive delete account system gives users full control over their data while maintaining system integrity.
