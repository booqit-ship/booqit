
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
    hostname: 'app.booqit.in',
    // Allow mixed content for better compatibility
    allowNavigation: [
      'app.booqit.in',
      '*.supabase.co',
      'supabase.com'
    ]
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
    },
    // Add deep linking support
    App: {
      deepLinkingEnabled: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Enable deep linking for password reset
    deepLinks: [
      {
        scheme: 'https',
        hostname: 'app.booqit.in'
      }
    ]
  }
};

export default config;
