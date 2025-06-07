
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCurrentSession, handleSessionExpiry, hasSupabaseTokens, clearSupabaseStorage } from '@/utils/sessionRecovery';
import { debounce } from '@/utils/debounce';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading, logout, setAuth, user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validationInProgress = useRef(false);
  const sessionRecoveryAttempted = useRef(false);

  // Enhanced session recovery function
  const recoverSessionIfNeeded = async (): Promise<boolean> => {
    if (!hasSupabaseTokens()) {
      console.log('🔄 Tokens missing, attempting session recovery...');
      
      try {
        // Try to refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (data?.session && !error) {
          console.log('✅ Session recovered successfully from missing tokens');
          // Update auth context with recovered session
          setAuth(true, user?.user_metadata?.role || null, data.session.user.id);
          return true;
        } else {
          console.log('❌ Session recovery failed:', error?.message);
          return false;
        }
      } catch (error) {
        console.error('❌ Exception during session recovery:', error);
        return false;
      }
    }
    return true; // Tokens exist, no recovery needed
  };

  // Debounced session validation with enhanced recovery
  const debouncedValidation = useRef(
    debounce(async () => {
      if (validationInProgress.current || loading || !isAuthenticated) {
        return;
      }

      try {
        validationInProgress.current = true;
        console.log('🔍 Performing background session validation...');
        
        // First, try to recover session if tokens are missing
        const recoverySuccessful = await recoverSessionIfNeeded();
        
        if (!recoverySuccessful) {
          console.log('🚪 Session recovery failed, showing user-friendly message...');
          toast.error('Your session has expired. Please log in again.', {
            style: {
              background: '#f3e8ff',
              border: '1px solid #d8b4fe',
              color: '#7c3aed'
            }
          });
          logout();
          return;
        }
        
        // Then validate the current session
        const isValid = await validateCurrentSession();
        
        if (!isValid && isAuthenticated) {
          console.log('⚠️ Session invalid, attempting recovery...');
          const recoveredSession = await handleSessionExpiry();
          
          if (!recoveredSession) {
            console.log('🚪 Session recovery failed, logging out...');
            toast.error('Your session has expired. Please log in again.', {
              style: {
                background: '#f3e8ff',
                border: '1px solid #d8b4fe',
                color: '#7c3aed'
              }
            });
            logout();
          } else {
            // Update auth context with recovered session
            console.log('✅ Session recovered, updating auth state');
            setAuth(true, user?.user_metadata?.role || null, recoveredSession.user.id);
          }
        }
      } catch (error) {
        console.error('❌ Error during background session validation:', error);
        // Don't immediately logout on errors, give user benefit of doubt
        console.log('⚠️ Validation error, but not logging out automatically');
      } finally {
        validationInProgress.current = false;
      }
    }, 1000) // 1 second debounce
  );

  // Enhanced visibility change handler
  const handleVisibilityChange = async () => {
    if (!document.hidden && !loading && isAuthenticated) {
      console.log('👁️ Tab became visible, validating session...');
      
      // Reset recovery attempt flag when tab becomes visible
      sessionRecoveryAttempted.current = false;
      
      // Try to recover session immediately if tokens are missing
      const recoverySuccessful = await recoverSessionIfNeeded();
      
      if (recoverySuccessful) {
        debouncedValidation.current();
      } else if (!sessionRecoveryAttempted.current) {
        sessionRecoveryAttempted.current = true;
        toast.error('Your session was cleared by the browser. Please log in again.', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #d8b4fe',
            color: '#7c3aed'
          }
        });
        logout();
      }
    }
  };

  // Enhanced focus handler
  const handleFocus = async () => {
    if (!loading && isAuthenticated) {
      console.log('🎯 Window focused, validating session...');
      
      // Try recovery first, then validate
      const recoverySuccessful = await recoverSessionIfNeeded();
      if (recoverySuccessful) {
        debouncedValidation.current();
      }
    }
  };

  // Enhanced online handler
  const handleOnline = async () => {
    if (!loading && isAuthenticated) {
      console.log('🌐 Connection restored, validating session...');
      
      // Try recovery first, then validate
      const recoverySuccessful = await recoverSessionIfNeeded();
      if (recoverySuccessful) {
        debouncedValidation.current();
      }
    }
  };

  const handleBeforeUnload = () => {
    console.log('🔄 Page unloading, cleaning up...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    const performSessionValidation = () => {
      debouncedValidation.current();
    };

    if (isAuthenticated && !loading) {
      // Set up periodic validation every 2 minutes (less frequent to reduce overhead)
      intervalRef.current = setInterval(performSessionValidation, 120000);
      
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
