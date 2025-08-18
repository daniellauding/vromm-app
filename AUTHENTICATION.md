### Authentication Guide (iOS + Android)

#### Overview
- **Centralized auth**: Supabase manages sessions for all providers.
- **Deep link**: `myapp://redirect` is used for returning to the app after OAuth.
- **Navigator remount**: After sign-in, the app forces a clean navigation remount based on `user` and a changing `key`. If the UI doesn’t switch in time, a production-safe reload (`Updates.reloadAsync`) runs automatically.
- **File references**:
  - App entrypoint: `App.tsx`
  - Supabase client: `src/lib/supabase.ts`
  - Auth context: `src/context/AuthContext.tsx`
  - Login UI: `src/screens/LoginScreen.tsx`

---

### Provider Flows

#### Facebook (OAuth via in-app browser)
- **How it works**
  - Start: `supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: 'myapp://redirect', scopes: 'public_profile email', skipBrowserRedirect: true }})`.
  - Supabase redirects back to `myapp://redirect` with either:
    - `?code=...` → app calls `supabase.auth.exchangeCodeForSession(code)`; or
    - `#access_token=...` → app calls `supabase.auth.setSession({ access_token, refresh_token })`.
  - App dismisses the browser → navigator remounts to `MainTabs`; if not, fallback reload runs.
- **Requirements**
  - Facebook app may be in Development mode → add testers.
  - Supabase provider must have a valid callback (`.../auth/v1/callback`); app uses `redirectTo = myapp://redirect`.
- **Common issues**
  - Dev mode access errors → add tester roles in Meta app.
  - Wrong redirect → ensure `myapp://redirect` is passed to Supabase.
  - Missing `email` → include scope `public_profile email`.

#### Google (Native SDK → Supabase `signInWithIdToken`)
- **iOS flow**
  1. `GoogleSignin.configure({ webClientId, iosClientId, scopes: ['openid','email','profile'] })`.
  2. `GoogleSignin.signIn()` → get `idToken`.
  3. `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
- **Android flow** (after setup)
  - Same logic; requires Google Play Services, an Android OAuth client, and SHA-1.
- **Supabase provider setup**
  - Add ALL Google client IDs (Web, iOS, Android) comma-separated in “Client IDs”.
  - Enable “Skip nonce checks” (required for iOS native sign-in).
- **Common issues**
  - `invalid_audience` → missing/mismatched client IDs in Supabase.
  - Expo Go lacks native module → use dev/prod build.

#### Apple (Native SDK → Supabase `signInWithIdToken`)
- **Flow (iOS)**
  1. Create random nonce (hash with SHA-256) and pass `hashedNonce` to `AppleAuthentication.signInAsync`.
  2. Receive `identityToken`.
  3. `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce: rawNonce })`.
- **Setup**
  - Supabase Apple provider Client ID must equal bundle ID (e.g., `com.vromm.app`).
  - App includes `expo-apple-authentication` plugin; rebuild required.
- **Common issues**
  - “Unacceptable audience” → Client ID mismatch.
  - Expo Go lacks native module → use dev/prod build.

#### Email / Password
- **Login**: `supabase.auth.signInWithPassword({ email, password })`.
- **Signup**: `supabase.auth.signUp` → user confirms email → first sign-in creates a session.
- The app’s `AuthContext` auto-creates a `profiles` row on `SIGNED_IN` if missing.

---

### Deep Linking + Navigation

- **Redirect**: `myapp://redirect` (configured in `app.json` via `"scheme": "myapp"`).
- **Handling** in `App.tsx`:
  - If URL has `?code=` → `exchangeCodeForSession(code)`.
  - Else if URL has `#access_token` → `setSession({ access_token, refresh_token })`.
  - Dismiss in-app browser; call `getSession()` to ensure state sync.
  - `onAuthStateChange('SIGNED_IN')` increments an internal `authKey` → forces a `NavigationContainer` remount.
  - Fallback: if still on an auth route after ~1.2s, call `Updates.reloadAsync()`.

---

### Platform Support Matrix

- **iOS**
  - Facebook: Browser OAuth (works).
  - Google: Native SDK (works in dev/prod builds).
  - Apple: Native SDK (works in dev/prod builds).
  - Email/Password: Works.
- **Android**
  - Facebook: Browser OAuth (works).
  - Google: Native SDK (pending completing Android OAuth client + SHA-1 setup).
  - Apple: Not applicable.
  - Email/Password: Works.

---

### Current Status (Working Now)
- Facebook (iOS/Android): OAuth via in-app browser works; returns to the app and signs in.
- Google (iOS): Native SDK works; signs in with `idToken` to Supabase.
- Apple (iOS): Native SDK works with nonce; signs in to Supabase.
- Email/Password: Works.
- Post-auth navigation: Automatic stack switch with remount; fallback full reload if needed.

---

### Missing / To Finish
- Google (Android):
  - Add `SHA-1` fingerprints (debug/release) to Google Cloud project.
  - Ensure Android OAuth client exists and add it to Supabase provider Client IDs.
- Facebook (Production):
  - If moving out of Dev mode, ensure appropriate app review/permissions for any advanced scopes.

---

### Opportunities / Improvements
- **Error UX**: Standardize error toasts for all providers.
- **Analytics**: Track provider + outcome for funnel analysis.
- **Retry UX**: Add a visible “Try again” if fallback reload triggers.
- **Profile enrichment**: Normalize provider metadata mapping to `profiles`.
- **Security hardening**: For Google, prefer nonce when possible (keep “Skip nonce checks” only if required on iOS native).

---

### Known Pitfalls and Fixes
- Stuck on login after `SIGNED_IN`:
  - Fixed via navigator remount + production-safe reload.
- Expo Go limitations:
  - Native SDKs (Google/Apple) unavailable → use dev/prod builds.
- Facebook “app not available”:
  - App in Dev mode → add tester roles or go Live.
- Google `invalid_audience`:
  - Add all OAuth client IDs to Supabase provider; verify `webClientId`/`iosClientId`.
- Apple audience error:
  - Supabase Apple provider Client ID must match bundle ID.

---

### Troubleshooting (What to Look for in Logs)
- OAuth return:
  - “OAuth code exchange succeeded” or “OAuth session set from fragment tokens”.
- Supabase state:
  - `[SUPABASE_AUTH] SIGNED_IN hasSession: true hasUser: true`.
- Navigation:
  - “Navigation state changed … currentRoute: MainTabs”.
  - Fallback: `[FALLBACK_CHECK] Still on auth route after sign-in, forcing app reload`.

---

### QA Checklist
- iOS dev build:
  - Email/Password, Facebook OAuth, Google native, Apple native.
- Android dev build:
  - Email/Password, Facebook OAuth, Google native (after SHA-1 + provider client IDs added).
- First-time OAuth user → profile row created on `SIGNED_IN`.
- After any auth completes → app lands in `MainTabs` without manual refresh.

---

### Quick Requirements Summary
- **App**
  - `app.json` includes `"scheme": "myapp"`.
- **Supabase**
  - Facebook: valid callback; use `redirectTo = myapp://redirect`.
  - Google: include Web, iOS, Android client IDs (comma-separated); enable “Skip nonce checks” (iOS).
  - Apple: Client ID = `com.vromm.app` (your bundle ID).
- **Builds**
  - Use development or production builds for native SDKs; Expo Go is not sufficient for Google/Apple. 