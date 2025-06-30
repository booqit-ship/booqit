
# BooqIt Android App

A beauty salon booking app built with Capacitor 5 that loads from the live domain.

## 🚀 Quick Setup

```bash
git clone <your_repo_url>
cd booqit
npm install
npx cap sync android
npx cap open android
```

## 📱 App Details

- **App Name**: booqit
- **App ID**: com.x16studios.booqit  
- **Version**: 1.0.1 (Production)
- **Java Version**: 17
- **Capacitor Version**: ^5.x
- **Live Domain**: https://app.booqit.in

## 🔧 Android SDK Requirements

- **minSdkVersion**: 24 (Android 7+)
- **targetSdkVersion**: 34
- **compileSdkVersion**: 34

## ✅ Features

- ✅ Native Push Notifications with runtime permission (Android 13+)
- ✅ Geolocation access with permission prompt
- ✅ Auto-update when live domain updates
- ✅ Firebase Cloud Messaging integration
- ✅ Google Maps API integration

## 🏗️ Building for Production

### In Android Studio:

1. Confirm `google-services.json` exists at `android/app/`
2. Sync Gradle
3. Build Signed APK or AAB
4. Upload to Play Store as version 1.0.1

### Commands:

```bash
# Sync native files
npx cap sync android

# Open in Android Studio
npx cap open android

# Copy web assets
npx cap copy android
```

## 📋 Permissions

The app requests these permissions:
- Location (Fine & Coarse)
- Push Notifications (Android 13+)
- Internet Access
- Network State

## 🎯 How It Works

- App loads UI from `https://app.booqit.in`
- Any update to the live domain = instant app update
- No Play Store update needed for frontend/backend changes
- Native features work through Capacitor plugins

## 📚 Documentation Links

- [Capacitor Getting Started](https://capacitorjs.com/docs/getting-started)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Publishing to Play Store](https://capacitorjs.com/docs/guides/publishing-android-app)

## 🚀 Final Behavior

✅ App loads UI and backend from https://app.booqit.in  
✅ Any update to that domain = instant update in app  
✅ Push + Geolocation work natively  
✅ No update triggered by GitHub changes  
✅ No Play Store update needed unless native code/plugins change

---

**Ready for production deployment! 🚀**
