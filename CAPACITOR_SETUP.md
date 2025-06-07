
# Capacitor Android Setup for booqit

## 📱 Setup Complete!

Your Capacitor Android app is now configured with:
- **App ID**: `com.x16studios.booqit`
- **App Name**: `booqit`
- **SHA-256**: `8A:0B:56:55:54:D4:C7:31:F1:26:0F:35:C8:AF:4A:80:1F:55:83:EB:B3:D7:A8:FF:C4:BC:B7:87:0A:2A:A3:4A`

## 🚀 Next Steps

### 1. Build the web assets
```bash
npm run build
```

### 2. Sync with Android
```bash
npx cap sync android
```

### 3. Open in Android Studio
```bash
npx cap open android
```

## 📋 Required Manual Steps

### 1. Add Google Services (for Push Notifications)
- Download `google-services.json` from Firebase Console
- Place it in `android/app/google-services.json`

### 2. Replace App Icons
Replace the placeholder icons in:
- `android/app/src/main/res/mipmap-*dpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-*dpi/ic_launcher_round.png`

### 3. Configure Signing (for Release)
Add to `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            keyAlias 'your-key-alias'
            keyPassword 'your-key-password'
            storeFile file('path/to/your/keystore.jks')
            storePassword 'your-store-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## 🔧 Available Scripts

- `npm run cap:sync` - Sync web assets with native project
- `npm run cap:open` - Open Android project in Android Studio

## 📚 Reference Documentation

- [Capacitor Getting Started](https://capacitorjs.com/docs/v5/getting-started)
- [Geolocation Plugin](https://capacitorjs.com/docs/apis/geolocation)
- [Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Android App Links](https://developer.android.com/training/app-links/verify-site-associations)

## 🛠️ Features Configured

✅ **Geolocation**: Request location permissions on app launch  
✅ **Push Notifications**: Ready for Firebase integration  
✅ **Deep Linking**: Android App Links support  
✅ **File Provider**: Camera and file access support  
✅ **Network Security**: HTTPS and cleartext traffic support  

## ⚠️ Important Notes

- The `google-services.json` file is required for push notifications to work
- Replace placeholder app icons before publishing
- Configure proper signing for release builds
- Test on physical device for location and push notification features
