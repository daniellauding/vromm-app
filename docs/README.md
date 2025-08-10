## Vromm Mobile Docs

This folder documents the core architecture, auth, data model and release flow for the Vromm React Native app (Expo, Supabase).

- See also app config in `app.json`, auth flows in `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`, and push notifications in `src/services/pushNotificationService.ts`.

### Contents
- [Architecture](./architecture.md)
- [Authentication](./auth.md)
- [Users & Profiles](./users.md)
- [Routes](./routes.md)
- [Exercises](./exercises.md)
- [Events](./events.md)
- [Messaging](./messaging.md)
- [Notifications](./notifications.md)
- [Beta Modal (Pricing/Todo/Feedback)](./beta-modal.md)
- [Release & Builds](./release.md)
- [Legal, Privacy & Account Deletion](./legal.md)

### Quick start (dev)
1. Install deps: `yarn`
2. Start Metro: `yarn start -c`
3. iOS simulator dev client: `npx expo run:ios` (or `eas build --platform ios --profile ios-simulator && eas build:run --platform ios --latest`)
4. Android: `npx expo run:android` or `eas build:run --platform android --latest`

### Providers (must be configured)
- Supabase → Auth → Providers
  - Google: Web Client ID + Secret; URL config includes `myapp://redirect`
  - Facebook: App ID/Secret (from the app that has Facebook Login product); URL config includes `myapp://redirect`
  - Apple: Client ID = `com.vromm.app`

Deep link scheme: `myapp` (see `app.json`). 