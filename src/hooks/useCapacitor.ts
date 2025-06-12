
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { requestNotificationPermission, setupNotifications, setupForegroundMessaging } from '@/lib/capacitor-firebase';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeCapacitor = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      
      console.log('📱 Platform:', native ? 'Native' : 'Web');
      console.log('📱 Platform name:', Capacitor.getPlatform());
      
      if (native) {
        try {
          // Configure status bar for native
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#7E57C2' });
          
          // Handle app state changes
          App.addListener('appStateChange', ({ isActive }) => {
            console.log('📱 App state changed. Active:', isActive);
          });
          
          // Handle back button
          App.addListener('backButton', ({ canGoBack }) => {
            console.log('📱 Back button pressed. Can go back:', canGoBack);
            if (!canGoBack) {
              App.exitApp();
            } else {
              window.history.back();
            }
          });
          
          console.log('✅ Native platform initialized');
        } catch (error) {
          console.error('❌ Error initializing native platform:', error);
        }
      }
      
      // Initialize notifications for both platforms
      try {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          await setupNotifications();
          setupForegroundMessaging();
          console.log('✅ Notifications initialized');
        }
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      }
      
      setIsReady(true);
    };

    initializeCapacitor();
  }, []);

  return {
    isNative,
    isReady,
    platform: Capacitor.getPlatform()
  };
};
