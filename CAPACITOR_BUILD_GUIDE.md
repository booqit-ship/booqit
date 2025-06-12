
# 📱 BooqIt Android App Build Guide

This guide helps you convert the BooqIt web app into an Android APK using Capacitor.

## 🛠️ Prerequisites

- **Node.js** (v16 or higher)
- **Android Studio** (latest version)
- **Java Development Kit (JDK)** (version 11 or higher)
- **Android SDK** (API level 33 or higher)

## 📋 Required Files Setup

✅ All required files are already configured in this repository:

- `capacitor.config.ts` - Main Capacitor configuration
- `public/manifest.json` - PWA manifest for installability  
- `src/lib/capacitor-firebase.ts` - Firebase setup for notifications
- `src/lib/capacitor-location.ts` - Location services
- `src/hooks/useCapacitor.ts` - Native platform initialization
- Updated `index.html` with mobile optimizations

## 🚀 Build Steps

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd booqit
npm install
```

### 2. Build the Web App
```bash
npm run build
```

### 3. Add Android Platform
```bash
npx cap add android
```

### 4. Configure Firebase for Android

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`booqit09-f4cfc`)
3. Click "Add app" → Android
4. Use package name: `com.x16studios.booqit`
5. Download `google-services.json`
6. Place it in: `android/app/google-services.json`

### 5. Configure Android Permissions

Edit `android/app/src/main/AndroidManifest.xml` and add these permissions:

```xml
<!-- Required Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<!-- Location Permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Notification Permissions (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Push Notifications -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 6. Sync and Open Android Studio
```bash
npx cap sync android
npx cap open android
```

### 7. Build APK in Android Studio

1. **Configure Signing**:
   - Go to `Build` → `Generate Signed Bundle/APK`
   - Create a new keystore or use existing one
   - Fill in keystore details

2. **Build Release APK**:
   - Select `Build` → `Build Bundle(s)/APK(s)` → `Build APK(s)`
   - Or use: `Build` → `Generate Signed Bundle/APK` for production

3. **Install on Device**:
   - Connect Android device via USB
   - Enable Developer Options & USB Debugging
   - Click "Run" button in Android Studio

## 📱 Testing Commands

```bash
# Run on Android emulator/device
npx cap run android

# Live reload during development
npx cap run android --livereload --external

# Sync changes after code updates
npx cap sync android
```

## 🔧 Useful Android Studio Shortcuts

- **Build APK**: `Build` → `Build Bundle(s)/APK(s)` → `Build APK(s)`
- **Clean Project**: `Build` → `Clean Project`
- **Rebuild**: `Build` → `Rebuild Project`
- **Logcat**: `View` → `Tool Windows` → `Logcat`

## 📚 Documentation Links

- [Capacitor Setup](https://capacitorjs.com/docs/getting-started)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Geolocation API](https://capacitorjs.com/docs/apis/geolocation)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Maps SDK for Android](https://developers.google.com/maps/documentation/android-sdk/start)

## 🐛 Common Issues

**Build Errors**:
- Ensure Java 11+ is installed
- Check Android SDK path in Android Studio
- Clean and rebuild project

**Firebase Issues**:
- Verify `google-services.json` is in correct location
- Check Firebase project configuration
- Ensure package name matches exactly

**Permission Issues**:
- Grant location permissions in device settings
- Enable notification permissions manually if needed

## 📦 Production Checklist

- [ ] Updated app version in `capacitor.config.ts`
- [ ] Added `google-services.json` for Firebase
- [ ] Configured all required permissions
- [ ] Tested on physical device
- [ ] Generated signed APK for Play Store
- [ ] Tested app installation from APK file

## 🎯 Next Steps After Build

1. **Test thoroughly** on different Android devices
2. **Upload to Google Play Console** for distribution
3. **Setup continuous deployment** with GitHub Actions
4. **Monitor crash reports** via Firebase Crashlytics
5. **Implement deep linking** for better user experience

Happy building! 🚀
