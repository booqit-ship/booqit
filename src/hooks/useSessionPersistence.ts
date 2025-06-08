
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
  const { isAuthenticated, setAuth, logout, session } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);

  // Enhanced debounced session validation with reduced delay
  const debouncedValidation = useRef(
    debounce(async () => {
      if (validationInProgress.current) {
        console.log('🔄 Validation already in progress, skipping');
        return;
      }

      const now = Date.now();
      if (now - lastValidation.current < 30000) { // 30 second cooldown
        console.log('🔄 Validation cooldown active, skipping');
        return;
      }

      await performSessionValidation();
    }, 500) // Reduced from 1000ms to 500ms for faster response
  ).current;

  const performSessionValidation = async () => {
    if (validationInProgress.current) return;
    
    try {
      validationInProgress.current = true;
      lastValidation.current = Date.now();
      
      console.log('🔍 Performing session validation');
      
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
          logout();
        }
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        }
      } else if (!isValid && !permanentData.isLoggedIn) {
        console.log('ℹ️ No session to validate');
      } else {
        console.log('✅ Session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during session validation:', error);
      
      // On critical validation errors, logout to prevent stuck states
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && isAuthenticated) {
        console.log('🚨 Critical validation error, forcing logout');
        logout();
      }
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    console.log('📱 Session persistence monitoring active with enhanced validation');
    
    // Immediate validation on mount
    setTimeout(() => {
      debouncedValidation();
    }, 1000);
    
    // Periodic validation every minute
    const validationInterval = setInterval(() => {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn) {
        console.log('⏰ Periodic session validation');
        debouncedValidation();
      }
    }, 60000); // 1 minute interval maintained
    
    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const permanentData = PermanentSession.getSession();
        console.log('👁️ Tab became visible - session status:', permanentData.isLoggedIn);
        
        if (permanentData.isLoggedIn) {
          debouncedValidation();
        }
      }
    };
    
    // Listen for focus events
    const handleFocus = () => {
      const permanentData = PermanentSession.getSession();
      console.log('🎯 Window focused - session status:', permanentData.isLoggedIn);
      
      if (permanentData.isLoggedIn) {
        debouncedValidation();
      }
    };
    
    // Listen for storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('booqit-') || e.key?.startsWith('sb-')) {
        console.log('🔄 Storage changed, validating session');
        setTimeout(() => {
          debouncedValidation();
        }, 100);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(validationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, setAuth, logout]);
  
  // No return value needed - this is purely active monitoring with state sync
};
