import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate, useLocation } from 'react-router-dom';
import { setupNotifications } from '@/lib/capacitor-firebase';
import { requestNotificationPermission } from '@/firebase';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const historyStack = useRef<string[]>([location.pathname]);

  useEffect(() => {
    const last = historyStack.current[historyStack.current.length - 1];
    if (location.pathname !== last) {
      historyStack.current.push(location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    const initializeCapacitor = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      console.log('📱 Platform:', native ? 'Native' : 'Web');
      console.log('📱 Platform name:', Capacitor.getPlatform());

      if (native) {
        try {
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#7E57C2' });

          if (Capacitor.getPlatform() === 'android') {
            console.log('📱 Initializing Android native push notifications...');
            const permStatus = await PushNotifications.requestPermissions();
            console.log('📱 Native push permission status:', permStatus);

            if (permStatus.receive === 'granted') {
              await PushNotifications.register();
              console.log('📱 Registered for native push notifications');

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

          App.addListener('appStateChange', ({ isActive }) => {
            console.log('📱 App state changed. Active:', isActive);
          });

          App.addListener('backButton', ({ canGoBack }) => {
            console.log('📱 Back button pressed. Can go back:', canGoBack);
            if (historyStack.current.length > 1) {
              historyStack.current.pop();
              navigate(-1);
            } else {
              App.exitApp();
            }
          });

          console.log('✅ Native platform initialized');
        } catch (error) {
          console.error('❌ Error initializing native platform:', error);
        }
      } else {
        // Only run web Firebase setup if NOT native
        try {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await setupNotifications();
            console.log('✅ Web notifications initialized');
          }
        } catch (error) {
          console.error('❌ Error initializing web notifications:', error);
        }
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
