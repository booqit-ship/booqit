
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCurrentSession, handleSessionExpiry } from '@/utils/sessionRecovery';
import { debounceAsync } from '@/utils/debounce';

/**
 * Session validation interval - 1 minute
 */
const VALIDATION_INTERVAL = 60000; // 1 minute

/**
 * Debounce delay for event-triggered validations
 */
const DEBOUNCE_DELAY = 1000; // 1 second

export const useSessionPersistence = () => {
  const { isAuthenticated, loading, logout, setAuth } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validationInProgress = useRef(false);

  /**
   * Performs session validation and updates global auth state
   */
  const performSessionValidation = useCallback(async () => {
    if (validationInProgress.current || loading) {
      console.log('⚠️ Session validation already in progress or auth loading, skipping...');
      return;
    }

    try {
      validationInProgress.current = true;
      console.log('🔍 Performing session validation with global state sync...');
      
      const isValid = await validateCurrentSession();
      
      if (!isValid && isAuthenticated) {
        console.log('⚠️ Session invalid, attempting recovery...');
        const recoveredSession = await handleSessionExpiry();
        
        if (!recoveredSession) {
          // Session could not be recovered, logout globally
          console.log('🚪 Session recovery failed, logging out globally...');
          logout();
        } else {
          // Session recovered, but we should let AuthContext handle the state update
          // through the onAuthStateChange listener
          console.log('✅ Session recovered, AuthContext will update automatically');
        }
      } else if (isValid && !isAuthenticated) {
        // Edge case: session is valid but auth context thinks user is logged out
        // This can happen after rapid tab switches or browser restarts
        console.log('🔄 Valid session found but AuthContext not updated, triggering refresh...');
        
        // Trigger a fresh session check in AuthContext
        window.dispatchEvent(new CustomEvent('supabase:session-refresh'));
      }
    } catch (error) {
      console.error('❌ Error during session validation:', error);
      
      // On validation error, logout to prevent broken state
      if (isAuthenticated) {
        console.log('🚪 Session validation error, logging out for safety...');
        logout();
      }
    } finally {
      validationInProgress.current = false;
    }
  }, [isAuthenticated, loading, logout, setAuth]);

  /**
   * Debounced version of session validation for events
   */
  const debouncedValidation = useCallback(
    debounceAsync(performSessionValidation, DEBOUNCE_DELAY),
    [performSessionValidation]
  );

  /**
   * Handle visibility change (tab switching)
   */
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && !loading && isAuthenticated) {
      console.log('👁️ Tab became visible, validating session...');
      debouncedValidation();
    }
  }, [loading, isAuthenticated, debouncedValidation]);

  /**
   * Handle window focus
   */
  const handleFocus = useCallback(() => {
    if (!loading && isAuthenticated) {
      console.log('🎯 Window focused, validating session...');
      debouncedValidation();
    }
  }, [loading, isAuthenticated, debouncedValidation]);

  /**
   * Handle page unload cleanup
   */
  const handleBeforeUnload = useCallback(() => {
    console.log('🔄 Page unloading, cleaning up session persistence...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  /**
   * Handle custom session refresh events
   */
  const handleSessionRefresh = useCallback(() => {
    console.log('🔄 Custom session refresh event received...');
    if (!loading) {
      performSessionValidation();
    }
  }, [loading, performSessionValidation]);

  useEffect(() => {
    // Set up periodic validation when authenticated
    if (isAuthenticated && !loading) {
      console.log('⏰ Setting up periodic session validation (1 minute intervals)...');
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up new interval for 1-minute validation
      intervalRef.current = setInterval(() => {
        console.log('⏰ Periodic session validation triggered...');
        performSessionValidation();
      }, VALIDATION_INTERVAL);
      
      // Validate immediately on mount when authenticated
      performSessionValidation();
    } else if (!isAuthenticated && intervalRef.current) {
      // Clear interval when not authenticated
      console.log('🛑 Clearing periodic session validation...');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, loading, performSessionValidation]);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('supabase:session-refresh', handleSessionRefresh);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('supabase:session-refresh', handleSessionRefresh);
      
      // Final cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleVisibilityChange, handleFocus, handleBeforeUnload, handleSessionRefresh]);
};
