# 🚨 FORCE RELOAD - DO THIS NOW!

## The fallback system is in the code BUT the app needs to reload to use it!

### **Step 1: Run the Missing Translations SQL**
1. Open Supabase SQL Editor
2. Run `ADD_MISSING_TRANSLATIONS.sql`
3. Verify: Should see "SUCCESS - All missing translations added!"

### **Step 2: NUCLEAR CACHE CLEAR**

In Xcode Simulator, do ALL of these:

1. **Device Menu → Erase All Content and Settings**
2. **Stop the Expo server** (if running)
3. **Run:**
```bash
cd /Users/daniellauding/Work/internal/vromm/vromm-app
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

4. **In Simulator:**
   - Press `Cmd+D` → Click "Reload"
   - OR: Shake device → Click "Reload"

5. **Sign in again** (data was cleared)

### **Step 3: Verify Fallbacks Work**

The hardcoded fallbacks are NOW in the code. Even if Supabase fails, you should see:

- ✅ **EN:** "Beginner", "Automatic", "Urban", "Passenger Car"
- ✅ **SWE:** "Nybörjare", "Automat", "Urban", "Personbil"

**NOT:**
- ❌ "filters.difficulty.beginner"
- ❌ "filters.transmissionType.automatic"

---

## 🎯 Quick Test

After reload:

1. Open FilterSheet (map → filter icon)
2. Scroll through ALL filter sections
3. **Every chip should show real text, NOT keys**
4. Switch language (Profile → Language → SWE/ENG)
5. **Text should change language**

---

## 🐛 If STILL Showing Keys After Reload:

Run this in terminal:
```bash
# Kill all Metro processes
pkill -f "react-native"
pkill -f "expo"

# Clear ALL caches
watchman watch-del-all
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# Restart completely
npx expo start --clear --reset-cache
```

Then reload app in simulator.

---

**The fallback system IS in the code now - it just needs the app to reload to activate! 🚀**

