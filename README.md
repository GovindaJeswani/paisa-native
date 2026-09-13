# Paisa Native — Android App

The native Android wrapper for [Paisa](https://exptracker-chi.vercel.app) expense tracker.

## What it adds over the PWA

| Feature | PWA | Native |
|---------|-----|--------|
| Track expenses | ✅ | ✅ |
| Google login + sync | ✅ | ✅ |
| Calendar views | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| Push notifications | ❌ (only when open) | ✅ (real Android notifications) |
| Back button | ❌ | ✅ (hardware back button works) |
| Splash screen | ❌ | ✅ (branded ₹ splash) |
| App icon | Generic | ✅ (custom Paisa icon) |

## How to build the APK

### Option 1: EAS Build (recommended — no Android Studio needed)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo (create free account at expo.dev)
eas login

# Build APK (runs in the cloud, ~5-10 minutes)
eas build --platform android --profile preview
```

This gives you a download link for the APK. Install it on your phone.

### Option 2: Local build (needs Android Studio)

```bash
# Install dependencies
npm install

# Generate native Android project
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Option 3: Run in development

```bash
# Start dev server
npx expo start

# Scan QR code with Expo Go app on your phone
```

## How notifications work

The app schedules 3 daily notifications:
- **1:30 PM** — "Had lunch? Track it before you forget!"
- **8:30 PM** — "End of day — log your expenses!"
- **10:00 PM** — Money tip/fact (rotates daily)

Users can disable these in Android notification settings for the app.

## Architecture

```
┌──────────────────────────┐
│  React Native (Expo)     │
│  ├── Push Notifications  │
│  ├── Back Button Handler │
│  ├── Splash Screen       │
│  └── WebView ────────────┤──→ https://exptracker-chi.vercel.app
│       ↕ postMessage      │    (Full Paisa web app)
│       bridge             │
└──────────────────────────┘
```

The WebView loads the production Paisa web app. All data, auth, and UI comes from the web app. The native shell adds:
- Real Android push notifications
- Hardware back button support
- Native splash screen
- Proper status bar styling
- Google login works natively (WebView handles OAuth)

## Adding SMS reading (future)

SMS reading requires `READ_SMS` permission which Google Play restricts to specific use cases. To add it:

1. Create a custom Expo config plugin for SMS
2. Add `android.permission.READ_SMS` and `android.permission.RECEIVE_SMS`
3. Create a native module that reads SMS and sends to WebView via postMessage
4. The web app already has a `NativeBridge` listener ready to receive SMS data

This requires a Play Store policy declaration explaining why your app needs SMS access.

## Files

- `App.tsx` — Main app with WebView, notifications, back button
- `app.json` — Expo config with Android permissions
- `eas.json` — Build profiles (preview = APK, production = AAB)
