
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, loading } = useAuth();
  const hookActive = useRef(false);

  useEffect(() => {
    // Don't start if auth is still loading
    if (loading) {
      return;
    }

    if (hookActive.current) {
      return;
    }

    hookActive.current = true;
    console.log('📱 Session persistence monitoring active (permanent mode)');
    
    // Only restore session if not already authenticated
    if (!isAuthenticated) {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && permanentData.userRole && permanentData.userId) {
        console.log('✅ Restoring permanent session on tab focus');
        setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
      }
    }
    
    // Listen for visibility changes to restore session if needed
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        const permanentData = PermanentSession.getSession();
        
        // If we have permanent session but not authenticated, restore it
        if (permanentData.isLoggedIn && !isAuthenticated) {
          console.log('✅ Restoring session on tab visible');
          if (permanentData.userRole && permanentData.userId) {
            setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      hookActive.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, isAuthenticated, setAuth]);
};
