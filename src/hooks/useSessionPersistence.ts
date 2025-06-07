
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
  const { isAuthenticated, setAuth, logout } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);

  // Debounced session validation to prevent overlapping calls
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
    }, 1000)
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
          setAuth(true, permanentData.userRole as any, permanentData.userId);
        } else {
          console.log('❌ Session recovery failed, clearing auth state');
          PermanentSession.clearSession();
          logout();
        }
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as any, permanentData.userId);
        }
      } else if (!isValid && !permanentData.isLoggedIn) {
        console.log('ℹ️ No session to validate');
      } else {
        console.log('✅ Session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during session validation:', error);
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    console.log('📱 Session persistence monitoring active with proactive validation');
    
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
    }, 60000); // 1 minute
    
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
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(validationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, setAuth, logout]);
  
  // No return value needed - this is purely active monitoring with state sync
};
