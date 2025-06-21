
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, loading } = useAuth();
  const hookActive = useRef(false);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (hookActive.current) return;
    
    hookActive.current = true;
    console.log('🔒 BULLETPROOF: Session persistence monitoring active');
    
    // Immediate session restoration function
    const restoreSession = () => {
      if (restoreAttempted.current) return;
      
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && permanentData.userRole && permanentData.userId) {
        console.log('⚡ BULLETPROOF: Instant session restoration');
        setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        restoreAttempted.current = true;
      }
    };

    // Restore immediately if not authenticated
    if (!loading && !isAuthenticated) {
      restoreSession();
    }
    
    // Listen for ALL possible events that could affect session
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        console.log('👁️ BULLETPROOF: Tab became visible - checking session');
        PermanentSession.syncStorages(); // Sync storages
        restoreSession();
      }
    };
    
    const handleFocus = () => {
      if (!loading) {
        console.log('🎯 BULLETPROOF: Window focused - checking session');
        PermanentSession.syncStorages(); // Sync storages
        restoreSession();
      }
    };
    
    const handlePageShow = () => {
      if (!loading) {
        console.log('📄 BULLETPROOF: Page shown - checking session');
        PermanentSession.syncStorages(); // Sync storages
        restoreSession();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes('booqit-') || e.key === 'booqit-logged-in')) {
        console.log('💾 BULLETPROOF: Storage changed - checking session');
        setTimeout(() => {
          restoreSession();
        }, 100);
      }
    };
    
    // Add ALL event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('storage', handleStorage);
    
    // Also check periodically (every 2 seconds) as a safety net
    const periodicCheck = setInterval(() => {
      if (!isAuthenticated && !loading) {
        const permanentData = PermanentSession.getSession();
        if (permanentData.isLoggedIn) {
          console.log('⏰ BULLETPROOF: Periodic check - restoring session');
          restoreSession();
        }
      }
    }, 2000);
    
    return () => {
      hookActive.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('storage', handleStorage);
      clearInterval(periodicCheck);
    };
  }, [loading, isAuthenticated, setAuth]);
};
