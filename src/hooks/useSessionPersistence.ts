
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';
import { validateCurrentSession } from '@/utils/sessionRecovery';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, logout, loading } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);
  const hookActive = useRef(false);

  const performSessionValidation = async () => {
    if (validationInProgress.current || loading) return;
    
    try {
      validationInProgress.current = true;
      lastValidation.current = Date.now();
      
      console.log('🔍 SESSION: Performing session validation');
      
      const isValid = await validateCurrentSession();
      const permanentData = PermanentSession.getSession();
      
      if (!isValid) {
        console.log('⚠️ SESSION: Session invalid, clearing permanent session');
        PermanentSession.clearSession();
        logout(); // This will properly handle the logout process
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ SESSION: Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        }
      }
      
    } catch (error) {
      console.error('❌ SESSION: Error during session validation:', error);
      
      // Handle specific auth errors
      if (error instanceof Error && (
        error.message?.includes('refresh_token_not_found') || 
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('expired') ||
        error.message?.includes('Unauthorized')
      )) {
        console.log('🚨 SESSION: Critical auth error, forcing logout');
        PermanentSession.clearSession();
        logout();
      }
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    // Don't start if auth is still loading
    if (loading) {
      console.log('⏳ SESSION: Auth still loading, delaying session persistence setup');
      return;
    }

    if (hookActive.current) {
      console.log('🔄 SESSION: Session persistence already active, skipping setup');
      return;
    }

    hookActive.current = true;
    console.log('📱 SESSION: Session persistence monitoring active');
    
    // Immediate validation check on startup
    const permanentData = PermanentSession.getSession();
    if (permanentData.isLoggedIn && !isAuthenticated) {
      console.log('🔄 SESSION: Performing initial session validation');
      setTimeout(() => {
        performSessionValidation();
      }, 1000);
    }
    
    // Periodic validation - every 30 minutes
    const validationInterval = setInterval(() => {
      const currentPermanentData = PermanentSession.getSession();
      if (currentPermanentData.isLoggedIn && !loading) {
        const timeSinceLastValidation = Date.now() - lastValidation.current;
        if (timeSinceLastValidation > 1800000) { // 30 minutes
          console.log('⏰ SESSION: Periodic session validation (30min)');
          performSessionValidation();
        }
      }
    }, 1800000); // 30 minute interval
    
    // Validate on tab visibility change (when user returns to app)
    let tabHiddenTime: number | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTime = Date.now();
      } else if (tabHiddenTime && !loading) {
        const hiddenDuration = Date.now() - tabHiddenTime;
        if (hiddenDuration > 300000) { // Only if hidden for 5+ minutes
          try {
            const currentPermanentData = PermanentSession.getSession();
            console.log('👁️ SESSION: Tab visible after absence - checking session');
            
            if (currentPermanentData.isLoggedIn) {
              setTimeout(() => {
                performSessionValidation();
              }, 2000);
            }
          } catch (error) {
            console.error('❌ SESSION: Error during visibility change validation:', error);
          }
        }
        tabHiddenTime = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      hookActive.current = false;
      clearInterval(validationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, isAuthenticated, setAuth, logout]);
};
