
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCurrentSession, handleSessionExpiry } from '@/utils/sessionRecovery';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validationInProgress = useRef(false);

  useEffect(() => {
    const performSessionValidation = async () => {
      if (validationInProgress.current || loading || !isAuthenticated) {
        return;
      }

      try {
        validationInProgress.current = true;
        console.log('🔍 Performing session validation...');
        
        const isValid = await validateCurrentSession();
        
        if (!isValid && isAuthenticated) {
          console.log('⚠️ Session invalid, attempting recovery...');
          await handleSessionExpiry();
        }
      } catch (error) {
        console.error('❌ Error during session validation:', error);
      } finally {
        validationInProgress.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !loading && isAuthenticated) {
        console.log('👁️ Tab became visible, validating session...');
        performSessionValidation();
      }
    };

    const handleFocus = () => {
      if (!loading && isAuthenticated) {
        console.log('🎯 Window focused, validating session...');
        performSessionValidation();
      }
    };

    const handleBeforeUnload = () => {
      console.log('🔄 Page unloading, cleaning up...');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    if (isAuthenticated && !loading) {
      // Set up periodic validation every 5 minutes
      intervalRef.current = setInterval(performSessionValidation, 300000);
      
      // Validate immediately on mount
      performSessionValidation();
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, loading]);
};
