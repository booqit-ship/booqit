
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.x16studios.booqit',
  appName: 'booqit',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://app.booqit.in',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      permissions: ['precise', 'coarse']
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false // Set to false for production
  }
};

export default config;
