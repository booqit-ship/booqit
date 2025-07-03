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
      // Keep history stack manageable (max 10 entries)
      if (historyStack.current.length > 10) {
        historyStack.current = historyStack.current.slice(-10);
      }
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
          await StatusBar.setOverlaysWebView({ overlay: false });

          // Setup native notification listeners
          UnifiedNotificationService.setupNativeListeners();

          App.addListener('appStateChange', ({ isActive }) => {
            console.log('📱 App state changed. Active:', isActive);
          });

          // Enhanced back button handling
          App.addListener('backButton', ({ canGoBack }) => {
            console.log('📱 Back button pressed. Can go back:', canGoBack);
            console.log('📱 Current path:', location.pathname);
            console.log('📱 History stack:', historyStack.current);
            
            const currentPath = location.pathname;
            
            // Handle specific routes
            if (currentPath === '/auth' || currentPath.startsWith('/auth')) {
              // If on auth page, check if there's role selection to go back to
              const urlParams = new URLSearchParams(location.search);
              const hasRole = urlParams.get('role') || location.state?.selectedRole;
              
              if (hasRole) {
                // Go back to role selection
                navigate('/', { replace: true });
              } else {
                // Exit app
                App.exitApp();
              }
              return;
            }
            
            // Handle role selection page
            if (currentPath === '/') {
              App.exitApp();
              return;
            }
            
            // Handle customer pages
            if (currentPath.startsWith('/home') || 
                currentPath.startsWith('/search') || 
                currentPath.startsWith('/calendar') || 
                currentPath.startsWith('/profile')) {
              
              if (currentPath === '/home') {
                // On home page, exit app
                App.exitApp();
              } else {
                // Go back to home
                navigate('/home', { replace: true });
              }
              return;
            }
            
            // Handle merchant pages
            if (currentPath.startsWith('/merchant')) {
              if (currentPath === '/merchant' || currentPath === '/merchant/') {
                // On merchant dashboard, exit app
                App.exitApp();
              } else {
                // Go back to merchant dashboard
                navigate('/merchant', { replace: true });
              }
              return;
            }
            
            // Handle nested pages - try browser back first
            if (historyStack.current.length > 1 && canGoBack) {
              console.log('📱 Using browser back navigation');
              historyStack.current.pop(); // Remove current page
              navigate(-1);
            } else {
              // No more history, exit app
              console.log('📱 No more history, exiting app');
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
  }, [location.pathname, navigate]);

  return {
    isNative,
    isReady,
    platform: Capacitor.getPlatform()
  };
};
