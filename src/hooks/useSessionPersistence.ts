
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';
import { validateCurrentSession, attemptSessionRecovery } from '@/utils/sessionRecovery';

// Debounce function to prevent overlapping validations
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, signOut, session, isLoading } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);
  const hookActive = useRef(false);

  // Enhanced debounced session validation with reduced delay
  const debouncedValidation = useRef(
    debounce(async () => {
      if (validationInProgress.current || isLoading) {
        console.log('🔄 Validation already in progress or auth loading, skipping');
        return;
      }

      const now = Date.now();
      if (now - lastValidation.current < 60000) { // Increased cooldown to 1 minute
        console.log('🔄 Validation cooldown active, skipping');
        return;
      }

      await performSessionValidation();
    }, 1000) // Increased debounce delay to reduce interference
  ).current;

  const performSessionValidation = async () => {
    if (validationInProgress.current || isLoading) return;
    
    try {
      validationInProgress.current = true;
      lastValidation.current = Date.now();
      
      console.log('🔍 Performing background session validation');
      
      const isValid = await validateCurrentSession();
      const permanentData = PermanentSession.getSession();
      
      if (!isValid && permanentData.isLoggedIn) {
        console.log('⚠️ Session invalid, attempting recovery');
        
        const recovery = await attemptSessionRecovery();
        
        if (recovery.success && permanentData.userRole && permanentData.userId) {
          console.log('✅ Session recovered, updating auth state');
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
          
          // Update session state if recovery provided a session
          if (recovery.session) {
            // Update permanent session with recovered session
            PermanentSession.saveSession(recovery.session, permanentData.userRole, permanentData.userId);
          }
        } else {
          console.log('❌ Session recovery failed, logging out');
          signOut();
        }
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        }
      } else if (!isValid && !permanentData.isLoggedIn) {
        console.log('ℹ️ No session to validate');
      } else {
        console.log('✅ Background session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during background session validation:', error);
      
      // On critical validation errors, only logout if we're sure there's an issue
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && isAuthenticated) {
        console.log('🚨 Critical validation error, forcing logout');
        signOut();
      }
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    // Don't start session monitoring if auth is still loading
    if (isLoading) {
      console.log('⏳ Auth still loading, delaying session persistence setup');
      return;
    }

    if (hookActive.current) {
      console.log('🔄 Session persistence already active, skipping setup');
      return;
    }

    hookActive.current = true;
    console.log('📱 Session persistence monitoring active');
    
    // Delayed initial validation - wait for auth to fully stabilize
    const initialValidationTimeout = setTimeout(() => {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn) {
        console.log('⏰ Initial session validation after auth stabilized');
        debouncedValidation();
      }
    }, 3000); // Wait 3 seconds for auth to stabilize
    
    // Periodic validation every 2 minutes (less frequent to reduce interference)
    const validationInterval = setInterval(() => {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && !isLoading) {
        console.log('⏰ Periodic session validation');
        debouncedValidation();
      }
    }, 120000); // 2 minute interval
    
    // Listen for page visibility changes (only when not loading)
    const handleVisibilityChange = () => {
      if (!document.hidden && !isLoading) {
        const permanentData = PermanentSession.getSession();
        console.log('👁️ Tab became visible - session status:', permanentData.isLoggedIn);
        
        if (permanentData.isLoggedIn) {
          // Delay validation to avoid interference with tab switch
          setTimeout(() => {
            debouncedValidation();
          }, 1000);
        }
      }
    };
    
    // Listen for focus events (only when not loading)
    const handleFocus = () => {
      if (!isLoading) {
        const permanentData = PermanentSession.getSession();
        console.log('🎯 Window focused - session status:', permanentData.isLoggedIn);
        
        if (permanentData.isLoggedIn) {
          // Delay validation to avoid interference with focus
          setTimeout(() => {
            debouncedValidation();
          }, 1000);
        }
      }
    };
    
    // Listen for storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key?.startsWith('booqit-') || e.key?.startsWith('sb-')) && !isLoading) {
        console.log('🔄 Storage changed, validating session after delay');
        setTimeout(() => {
          debouncedValidation();
        }, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      hookActive.current = false;
      clearTimeout(initialValidationTimeout);
      clearInterval(validationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isLoading, isAuthenticated, setAuth, signOut]); // Added isLoading dependency
  
  // No return value needed - this is purely active monitoring with state sync
};
