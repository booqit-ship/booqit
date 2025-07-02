import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export const setupNativeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configure status bar to not overlay the web view
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Set status bar style (Light or Dark based on your theme)
      await StatusBar.setStyle({ style: Style.Default });
      
      // Set status bar background color to match your app
      await StatusBar.setBackgroundColor({ color: '#7E57C2' });
      
      console.log('✅ Native Capacitor setup complete');
    } catch (error) {
      console.error('❌ Error setting up native Capacitor:', error);
    }
  }
};