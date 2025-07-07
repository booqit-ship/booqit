
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';
import { UnifiedNotificationService } from '@/services/UnifiedNotificationService';
import { setupNativeCapacitorFeatures } from '@/utils/nativeCapacitorSetup';
import { useAndroidBackButton } from './useAndroidBackButton';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Use the dedicated Android back button handler
  useAndroidBackButton();

  useEffect(() => {
    const initializeCapacitor = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      console.log('📱 Platform:', native ? 'Native' : 'Web');
      console.log('📱 Platform name:', Capacitor.getPlatform());

      if (native) {
        try {
          // Setup native feel first
          setupNativeCapacitorFeatures();
          
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#7E57C2' });

          // Setup native notification listeners
          UnifiedNotificationService.setupNativeListeners();

          App.addListener('appStateChange', ({ isActive }) => {
            console.log('📱 App state changed. Active:', isActive);
          });

          console.log('✅ Native platform initialized with native feel');
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
