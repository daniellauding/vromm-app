## Release & Builds

### Preview builds
```bash
# iOS + Android preview
EAS_NO_VCS=1 eas build --platform all --profile preview --non-interactive

# Install latest
eas build:run --platform android --latest
# Or iOS simulator
eas build --platform ios --profile ios-simulator --non-interactive && eas build:run --platform ios --latest
```

### Start Metro
```bash
yarn start -c
```

### Credentials
- iOS: APNs key + Distribution certs managed in EAS
- Android: FCM via `google-services.json`

### Store submission
```bash
eas submit --platform ios --latest
 eas submit --platform android --latest --track internal
``` 