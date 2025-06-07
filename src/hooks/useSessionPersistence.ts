
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCurrentSession, handleSessionExpiry, hasSupabaseTokens, clearSupabaseStorage } from '@/utils/sessionRecovery';
import { debounce } from '@/utils/debounce';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading, logout, setAuth, user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validationInProgress = useRef(false);

  // Debounced session validation to prevent overlapping calls
  const debouncedValidation = useRef(
    debounce(async () => {
      if (validationInProgress.current || loading || !isAuthenticated) {
        return;
      }

      // Check if tokens still exist (cache clear detection)
      if (!hasSupabaseTokens()) {
        console.log('🚨 Supabase tokens missing, logging out...');
        logout();
        return;
      }

      try {
        validationInProgress.current = true;
        console.log('🔍 Performing background session validation...');
        
        const isValid = await validateCurrentSession();
        
        if (!isValid && isAuthenticated) {
          console.log('⚠️ Session invalid, attempting recovery...');
          const recoveredSession = await handleSessionExpiry();
          
          if (!recoveredSession) {
            console.log('🚪 Session recovery failed, logging out...');
            logout();
          } else {
            // Update auth context with recovered session
            console.log('✅ Session recovered, updating auth state');
            setAuth(true, user?.user_metadata?.role || null, recoveredSession.user.id);
          }
        }
      } catch (error) {
        console.error('❌ Error during background session validation:', error);
      } finally {
        validationInProgress.current = false;
      }
    }, 1000) // 1 second debounce
  );

  useEffect(() => {
    const performSessionValidation = () => {
      debouncedValidation.current();
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

    const handleOnline = () => {
      if (!loading && isAuthenticated) {
        console.log('🌐 Connection restored, validating session...');
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
      // Set up periodic validation every 1 minute (more frequent for better UX)
      intervalRef.current = setInterval(performSessionValidation, 60000);
      
      // Perform initial validation after a short delay
      setTimeout(performSessionValidation, 2000);
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, loading, logout, setAuth, user]);
};
