
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
  const { isAuthenticated, setAuth, logout, loading } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);
  const hookActive = useRef(false);

  // Much less aggressive debounced validation
  const debouncedValidation = useRef(
    debounce(async () => {
      if (validationInProgress.current || loading) {
        console.log('🔄 Validation already in progress or auth loading, skipping');
        return;
      }

      const now = Date.now();
      if (now - lastValidation.current < 300000) { // 5 minute cooldown
        console.log('🔄 Validation cooldown active, skipping');
        return;
      }

      await performSessionValidation();
    }, 5000) // 5 second debounce
  ).current;

  const performSessionValidation = async () => {
    if (validationInProgress.current || loading) return;
    
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
        } else {
          console.log('❌ Session recovery failed, logging out');
          logout();
        }
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        }
      } else {
        console.log('✅ Background session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during background session validation:', error);
      
      // Only logout on critical errors, not network issues
      if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Already Used')) {
        console.log('🚨 Critical session error, forcing logout');
        logout();
      }
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    // Don't start session monitoring if auth is still loading
    if (loading) {
      console.log('⏳ Auth still loading, delaying session persistence setup');
      return;
    }

    if (hookActive.current) {
      console.log('🔄 Session persistence already active, skipping setup');
      return;
    }

    hookActive.current = true;
    console.log('📱 Session persistence monitoring active (simplified)');
    
    // Much less frequent validation - only every 10 minutes
    const validationInterval = setInterval(() => {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && !loading) {
        console.log('⏰ Periodic session validation (10min)');
        debouncedValidation();
      }
    }, 600000); // 10 minute interval
    
    // Only validate on visibility change if tab was hidden for more than 5 minutes
    let tabHiddenTime: number | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTime = Date.now();
      } else if (tabHiddenTime && !loading) {
        const hiddenDuration = Date.now() - tabHiddenTime;
        if (hiddenDuration > 300000) { // Only if hidden for 5+ minutes
          const permanentData = PermanentSession.getSession();
          console.log('👁️ Tab visible after long absence - session status:', permanentData.isLoggedIn);
          
          if (permanentData.isLoggedIn) {
            setTimeout(() => {
              debouncedValidation();
            }, 2000);
          }
        }
        tabHiddenTime = null;
      }
    };
    
    // Less aggressive focus handling
    const handleFocus = () => {
      if (!loading && !tabHiddenTime) {
        const permanentData = PermanentSession.getSession();
        const timeSinceLastValidation = Date.now() - lastValidation.current;
        
        if (permanentData.isLoggedIn && timeSinceLastValidation > 300000) { // Only if 5+ minutes since last validation
          console.log('🎯 Window focused after long time - validating session');
          setTimeout(() => {
            debouncedValidation();
          }, 3000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      hookActive.current = false;
      clearInterval(validationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading, isAuthenticated, setAuth, logout]);
  
  // No return value needed - this is purely active monitoring with state sync
};
