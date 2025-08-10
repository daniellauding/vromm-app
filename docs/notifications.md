## Notifications

### Setup
- Plugin in `app.json`: `expo-notifications`
- iOS: APNs key via EAS credentials (recommended)
- Android: `google-services.json` in project

### Token registration
- `pushNotificationService.registerForPushNotifications()`
- Tokens stored in `user_push_tokens` (per device, platform)

### Guards
- iOS Simulator lacks native module → service is guarded; no crashes
- Badge updates call `setBadgeCountAsync` only when native module exists

### Project ID
- Uses `Constants.expoConfig.extra.eas.projectId` when available 