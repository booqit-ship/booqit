
import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';
import { UnifiedNotificationService } from '@/services/UnifiedNotificationService';

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

          // Setup native notification listeners
          UnifiedNotificationService.setupNativeListeners();

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
