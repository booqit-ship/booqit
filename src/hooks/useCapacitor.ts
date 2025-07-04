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

          // Enhanced Android Back Button Handler
          App.addListener('backButton', ({ canGoBack }) => {
            console.log('📱 Back button pressed. Can go back:', canGoBack);
            console.log('📱 Current path:', location.pathname);
            console.log('📱 History stack:', historyStack.current);

            // Special handling for auth-related pages and modals
            if (location.pathname === '/auth' || location.pathname === '/') {
              // If on auth page or root, check if we can go back to role selection
              const urlParams = new URLSearchParams(window.location.search);
              const hasRoleState = window.history.state?.selectedRole;
              
              if (hasRoleState) {
                // Navigate back to role selection
                navigate('/', { replace: true });
                return;
              }
            }

            // Handle other auth-related pages
            if (location.pathname.includes('/auth') || 
                location.pathname === '/forgot-password' || 
                location.pathname === '/reset-password' ||
                location.pathname === '/verify') {
              navigate('/', { replace: true });
              return;
            }

            // Handle merchant onboarding
            if (location.pathname === '/merchant/onboarding') {
              // Don't allow back during onboarding - exit app instead
              App.exitApp();
              return;
            }

            // Standard navigation logic
            if (historyStack.current.length > 1) {
              historyStack.current.pop();
              navigate(-1);
            } else {
              // If no history, handle based on current route
              if (location.pathname === '/home' || location.pathname === '/merchant') {
                // Main pages - exit app
                App.exitApp();
              } else {
                // Other pages - go to appropriate home
                const isOnMerchantRoute = location.pathname.startsWith('/merchant');
                navigate(isOnMerchantRoute ? '/merchant' : '/home', { replace: true });
              }
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
  }, [navigate, location.pathname]);

  return {
    isNative,
    isReady,
    platform: Capacitor.getPlatform()
  };
};
