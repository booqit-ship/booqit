
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, logout, loading } = useAuth();
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
    console.log('📱 Session persistence monitoring active (simplified)');
    
    // Only validate on very long absence from tab (30+ minutes)
    let tabHiddenTime: number | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTime = Date.now();
      } else if (tabHiddenTime && !loading) {
        const hiddenDuration = Date.now() - tabHiddenTime;
        // Only validate if hidden for more than 30 minutes
        if (hiddenDuration > 1800000) { // 30 minutes
          const permanentData = PermanentSession.getSession();
          console.log('👁️ Tab visible after very long absence - light session check');
          
          if (!permanentData.isLoggedIn && isAuthenticated) {
            console.log('⚠️ Session lost during long absence - logging out');
            logout();
          } else if (permanentData.isLoggedIn && !isAuthenticated) {
            console.log('✅ Restoring session after long absence');
            if (permanentData.userRole && permanentData.userId) {
              setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
            }
          }
        }
        tabHiddenTime = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      hookActive.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, isAuthenticated, setAuth, logout]);
};
