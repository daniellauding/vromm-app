## Authentication

### Flows
- Email/Password: Signup/Login screens, Supabase Auth
- Google: Web OAuth via Supabase + AuthSession (one Web Client ID)
  - Redirect: `myapp://redirect`
  - Supabase Provider: set Web Client ID + Secret
- Facebook: Web OAuth via Supabase + AuthSession
  - Facebook Developers: Valid redirect URI = Supabase callback
  - iOS platform in Meta app: Bundle ID `com.vromm.app`
- Apple: Native (`expo-apple-authentication`) with nonce; Supabase `signInWithIdToken({ provider: 'apple' })`
  - Supabase Apple Client ID = `com.vromm.app`

### Redirects
- Supabase URL Config → Additional Redirect URLs: `myapp://redirect`
- App deep link scheme: `myapp`
- Email links (confirm/reset): link to deep link first; web fallback page should offer “Open app” + “Continue in browser”

### Session
- Auth state driven by `AuthContext` (listens to Supabase session)
- Silent cancel handling for OAuth (no blocking alerts)

### Account deletion (policy)
- Always delete PII, tokens, OAuth identities, sessions
- Ask user:
  - Keep public contributions (anonymize)
  - Or remove everything
- Private content always removed

### Provider matrices
- Google: Web client only (works iOS/Android/web)
- Facebook: App with Facebook Login product only (one App ID)
- Apple: iOS only, native 