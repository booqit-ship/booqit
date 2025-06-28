
import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { setupNotifications } from '@/lib/capacitor-firebase';
import { requestNotificationPermission } from '@/firebase';
import { useNavigate, useLocation } from 'react-router-dom';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Track visited paths in a ref to know if we can really go back
  const historyStack = useRef<string[]>([location.pathname]);

  useEffect(() => {
    // Only push new location if it's not the same as the current last one
    const last = historyStack.current[historyStack.current.length - 1];
    if (location.pathname !== last) {
      historyStack.current.push(location.pathname);
    }
    // eslint-disable-next-line
  }, [location.pathname]);

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

          // Initialize native push notifications for Android
          if (Capacitor.getPlatform() === 'android') {
            console.log('📱 Initializing Android native push notifications...');
            
            // Request permissions for native push notifications
            const permStatus = await PushNotifications.requestPermissions();
            console.log('📱 Native push permission status:', permStatus);
            
            if (permStatus.receive === 'granted') {
              // Register for push notifications
              await PushNotifications.register();
              console.log('📱 Registered for native push notifications');
              
              // Add listeners for push notifications
              PushNotifications.addListener('registration', (token) => {
                console.log('📱 Native push registration token:', token.value);
              });
              
              PushNotifications.addListener('registrationError', (error) => {
                console.error('❌ Native push registration error:', error);
              });
              
              PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('📱 Native push notification received:', notification);
              });
              
              PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('📱 Native push notification action performed:', notification);
              });
            }
          }

          // Handle app state changes
          App.addListener('appStateChange', ({ isActive }) => {
            console.log('📱 App state changed. Active:', isActive);
          });

          // Handle back button
          App.addListener('backButton', ({ canGoBack }) => {
            console.log('📱 Back button pressed. Can go back:', canGoBack);
            // If historyStack is more than one, we can go back
            if (historyStack.current.length > 1) {
              historyStack.current.pop(); // remove current page
              navigate(-1); // go back in SPA history
            } else {
              // No where left to go back, exit app
              App.exitApp();
            }
          });

          console.log('✅ Native platform initialized');
        } catch (error) {
          console.error('❌ Error initializing native platform:', error);
        }
      }

      // Initialize web notifications for both platforms (web and native as fallback)
      try {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          await setupNotifications();
          console.log('✅ Web notifications initialized');
        }
      } catch (error) {
        console.error('❌ Error initializing web notifications:', error);
      }

      setIsReady(true);
    };

    initializeCapacitor();
    // eslint-disable-next-line
  }, []);

  return {
    isNative,
    isReady,
    platform: Capacitor.getPlatform()
  };
};
