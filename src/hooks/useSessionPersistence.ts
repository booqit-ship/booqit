
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';
import { InstantSessionLoader } from '@/utils/instantSessionLoader';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, loading } = useAuth();
  const hookActive = useRef(false);
  const restoreAttempted = useRef(false);
  const continuousMonitoring = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hookActive.current) return;
    
    hookActive.current = true;
    console.log('🔒 INSTANT PERSISTENCE: Session persistence monitoring active');
    
    // Immediate session restoration function
    const restoreSession = () => {
      if (restoreAttempted.current) return;
      
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && permanentData.userRole && permanentData.userId) {
        console.log('⚡ INSTANT PERSISTENCE: Instant session restoration');
        setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        restoreAttempted.current = true;
        return true;
      }
      return false;
    };

    // Restore immediately if not authenticated and we have instant session
    if (!loading && !isAuthenticated && InstantSessionLoader.hasInstantSession()) {
      restoreSession();
    }
    
    // AGGRESSIVE event listeners for bulletproof persistence
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        console.log('👁️ INSTANT PERSISTENCE: Tab became visible - checking session');
        PermanentSession.syncStorages();
        restoreSession();
      }
    };
    
    const handleFocus = () => {
      if (!loading) {
        console.log('🎯 INSTANT PERSISTENCE: Window focused - checking session');
        PermanentSession.syncStorages();
        restoreSession();
      }
    };
    
    const handlePageShow = (e: PageTransitionEvent) => {
      if (!loading) {
        console.log('📄 INSTANT PERSISTENCE: Page shown - checking session');
        PermanentSession.syncStorages();
        restoreSession();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes('booqit-') || e.key === 'booqit-logged-in')) {
        console.log('💾 INSTANT PERSISTENCE: Storage changed - checking session');
        setTimeout(() => {
          restoreSession();
        }, 50); // Faster response
      }
    };

    const handleBeforeUnload = () => {
      // Sync storages before page unloads
      PermanentSession.syncStorages();
    };

    const handleRouteChange = () => {
      // Ensure session persists across route changes
      if (!isAuthenticated && !loading) {
        console.log('🔄 INSTANT PERSISTENCE: Route change - checking session');
        restoreSession();
      }
    };
    
    // Add ALL event listeners for maximum coverage
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handleRouteChange);
    
    // CONTINUOUS monitoring every 1 second for bulletproof coverage
    continuousMonitoring.current = setInterval(() => {
      if (!isAuthenticated && !loading) {
        const permanentData = PermanentSession.getSession();
        if (permanentData.isLoggedIn) {
          console.log('⏰ INSTANT PERSISTENCE: Continuous check - restoring session');
          restoreSession();
        }
      }
    }, 1000); // Check every second
    
    return () => {
      hookActive.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handleRouteChange);
      
      if (continuousMonitoring.current) {
        clearInterval(continuousMonitoring.current);
      }
    };
  }, [loading, isAuthenticated, setAuth]);
};
