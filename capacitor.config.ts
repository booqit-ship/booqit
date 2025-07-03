
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.x16studios.booqit',
  appName: 'booqit',
  webDir: 'dist',
  bundledWebRuntime: false,
  // 🔥 CRITICAL: Add server configuration for custom URL scheme handling
  server: {
    // This allows the app to handle deep links properly
    androidScheme: 'https',
    hostname: 'app.booqit.in'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      permissions: ['precise', 'coarse']
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'Default',
      backgroundColor: '#7E57C2'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
