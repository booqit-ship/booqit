
# Scripts to Add to package.json

Add these scripts to your `package.json` manually:

```json
{
  "scripts": {
    "cap:sync": "npx cap sync android",
    "cap:open": "npx cap open android",
    "cap:run": "npx cap run android",
    "cap:build": "npm run build && npx cap sync android"
  }
}
```

These scripts will help you:
- `npm run cap:sync` - Sync your web build with the Android project
- `npm run cap:open` - Open the Android project in Android Studio
- `npm run cap:run` - Build and run on connected Android device/emulator
- `npm run cap:build` - Build web assets and sync in one command
