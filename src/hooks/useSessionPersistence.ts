
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading } = useAuth();
  const hookActive = useRef(false);

  useEffect(() => {
    // TEMPORARILY DISABLED to fix auth loops
    // This hook was causing aggressive session validation that interfered with normal auth flow
    console.log('📱 Session persistence monitoring DISABLED (fixing auth loops)');
    
    if (hookActive.current) {
      return;
    }
    
    hookActive.current = true;
    
    // Only do minimal cleanup - no aggressive validation
    const cleanup = () => {
      try {
        // Just refresh the permanent session timestamp if logged in
        if (isAuthenticated && !loading) {
          PermanentSession.refreshLogin();
        }
      } catch (error) {
        console.error('❌ Error in minimal session cleanup:', error);
      }
    };
    
    // Very infrequent cleanup - once every hour
    const cleanupInterval = setInterval(cleanup, 3600000); // 1 hour
    
    return () => {
      hookActive.current = false;
      clearInterval(cleanupInterval);
    };
  }, [isAuthenticated, loading]);
};
