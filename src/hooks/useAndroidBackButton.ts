
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStack } from '@/contexts/NavigationStackContext';

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { popFromStack, hasItems, getCurrentItem } = useNavigationStack();

  useEffect(() => {
    // Only set up back button handling on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    console.log('🔙 Setting up Android back button handler');

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
        const currentPath = location.pathname;
        
        console.log('🔙 Back button pressed:', {
          currentPath,
          canGoBack,
          historyLength: window.history.length,
          hasStackItems: hasItems(),
          currentStackItem: getCurrentItem()
        });

        // Check if we have items in the navigation stack (modals, widgets, tabs)
        if (hasItems()) {
          const stackItem = popFromStack();
          console.log('🔙 Handling stack item:', stackItem);
          
          if (stackItem) {
            switch (stackItem.type) {
              case 'modal':
              case 'widget':
                // Close the modal/widget by dispatching a close event
                window.dispatchEvent(new CustomEvent('closeCurrentModal', { detail: stackItem }));
                return;
              case 'tab':
                // Navigate back to the previous tab/page
                if (stackItem.path !== currentPath) {
                  navigate(stackItem.path, { replace: true });
                  return;
                }
                break;
            }
          }
        }

        // Define root/home paths where we should exit the app
        const rootPaths = ['/', '/home', '/merchant'];
        const isOnRootPath = rootPaths.includes(currentPath);

        // Special handling for auth pages - always go to root
        if (currentPath.includes('/auth') || 
            currentPath === '/forgot-password' || 
            currentPath === '/reset-password' ||
            currentPath === '/verify') {
          console.log('🔙 On auth page, navigating to root');
          navigate('/', { replace: true });
          return;
        }

        // Special handling for merchant onboarding - exit app
        if (currentPath === '/merchant/onboarding') {
          console.log('🔙 On onboarding, exiting app');
          App.exitApp();
          return;
        }

        // If on root path, exit the app
        if (isOnRootPath) {
          console.log('🔙 On root path, exiting app');
          App.exitApp();
          return;
        }

        // Try to go back in history first
        if (canGoBack && window.history.length > 1) {
          console.log('🔙 Going back in history');
          navigate(-1);
        } else {
          // Fallback: navigate to appropriate home based on current route
          const isOnMerchantRoute = currentPath.startsWith('/merchant');
          const fallbackPath = isOnMerchantRoute ? '/merchant' : '/home';
          
          console.log('🔙 No history, navigating to:', fallbackPath);
          navigate(fallbackPath, { replace: true });
        }
      });
    };

    setupListener();

    // Cleanup listener on unmount
    return () => {
      console.log('🔙 Cleaning up back button handler');
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location.pathname, popFromStack, hasItems, getCurrentItem]);
};
