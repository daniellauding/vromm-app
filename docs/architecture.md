## Architecture

### Stack
- Expo (SDK 53), React Native, TypeScript
- Supabase (Auth, Postgres, Realtime, Storage)
- Tamagui UI
- Expo Notifications
- OAuth: Google (AuthSession), Facebook (AuthSession), Apple (native)

### Key files
- App entry: `App.tsx`
- Navigation: `src/components/TabNavigator.tsx`
- Auth screens: `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`
- Auth context: `src/context/AuthContext.tsx`
- Notifications: `src/services/pushNotificationService.ts`
- Beta modal: `src/components/BetaInfoModal.tsx` + `src/components/beta/*`

### Config
- Deep link scheme: `myapp` (see `app.json`)
- Supabase callback: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
- App redirect in OAuth: `myapp://redirect`

### Environments
- Dev: EAS preview builds, simulator/device dev clients
- Prod: store builds (TestFlight / Play internal)

### Data ownership
- PII in `profiles` (email stored in Supabase Auth)
- Content (routes, exercises, events) stored by owner ID
- Push tokens in `user_push_tokens`

### Deletion/anonymization (high level)
- Always delete PII and tokens
- Keep public content if user opts-in; reassign to “Deleted user” and scrub author fields
- Delete private drafts/DMs 