
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

export const useSessionPersistence = () => {
  const { isAuthenticated, setAuth, logout, loading } = useAuth();
  const hookActive = useRef(false);

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
    console.log('📱 Session persistence monitoring active (email-only)');
    
    // Simple session recovery for email auth
    const performSessionValidation = () => {
      try {
        const permanentData = PermanentSession.getSession();
        
        if (!isAuthenticated && permanentData.isLoggedIn) {
          console.log('✅ Valid permanent session found, updating auth state');
          if (permanentData.userRole && permanentData.userId) {
            setAuth(true, permanentData.userRole as 'customer' | 'merchant', permanentData.userId);
          }
        }
      } catch (error) {
        console.error('❌ Error during session validation:', error);
        logout();
      }
    };

    // Validate on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        performSessionValidation();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      hookActive.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, isAuthenticated, setAuth, logout]);
};
