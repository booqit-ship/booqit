
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';
import { validateCurrentSession } from '@/utils/sessionRecovery';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, logout, loading } = useAuth();
  const validationInProgress = useRef(false);
  const lastValidation = useRef(0);
  const hookActive = useRef(false);

  // Conservative validation - only when really needed
  const performSessionValidation = async () => {
    if (validationInProgress.current || loading) return;
    
    try {
      validationInProgress.current = true;
      lastValidation.current = Date.now();
      
      console.log('🔍 Performing minimal session validation');
      
      const isValid = await validateCurrentSession();
      const permanentData = PermanentSession.getSession();
      
      // Only act if there's a clear mismatch
      if (!isValid && permanentData.isLoggedIn) {
        console.log('⚠️ Session invalid but permanent session exists - logging out');
        logout();
      } else if (isValid && permanentData.isLoggedIn && !isAuthenticated) {
        console.log('✅ Valid session found, updating auth state');
        if (permanentData.userRole && permanentData.userId) {
          setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
        }
      }
      
    } catch (error) {
      console.error('❌ Error during session validation:', error);
      
      // Only logout on critical auth errors
      if (error instanceof Error && (
        error.message?.includes('Invalid') || 
        error.message?.includes('Unauthorized') ||
        error.message?.includes('expired')
      )) {
        console.log('🚨 Critical auth error, forcing logout');
        logout();
      }
    } finally {
      validationInProgress.current = false;
    }
  };

  useEffect(() => {
    // Don't start if auth is still loading
    if (loading) {
      console.log('⏳ Auth still loading, delaying session persistence setup');
      return;
    }

    if (hookActive.current) {
      console.log('🔄 Session persistence already active, skipping setup');
      return;
    }

    hookActive.current = true;
    console.log('📱 Session persistence monitoring active (minimal)');
    
    // Less frequent validation - every 15 minutes
    const validationInterval = setInterval(() => {
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && !loading) {
        const timeSinceLastValidation = Date.now() - lastValidation.current;
        if (timeSinceLastValidation > 900000) { // 15 minutes
          console.log('⏰ Periodic session validation (15min)');
          performSessionValidation();
        }
      }
    }, 900000); // 15 minute interval
    
    // Only validate on long absence from tab
    let tabHiddenTime: number | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTime = Date.now();
      } else if (tabHiddenTime && !loading) {
        const hiddenDuration = Date.now() - tabHiddenTime;
        if (hiddenDuration > 600000) { // Only if hidden for 10+ minutes
          try {
            const permanentData = PermanentSession.getSession();
            console.log('👁️ Tab visible after long absence - checking session');
            
            if (permanentData.isLoggedIn) {
              setTimeout(() => {
                performSessionValidation();
              }, 3000);
            }
          } catch (error) {
            console.error('❌ Error during visibility change validation:', error);
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
