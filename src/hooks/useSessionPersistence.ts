
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermanentSession } from '@/utils/permanentSession';

// This hook is now completely passive - ZERO session recovery or validation
export const useSessionPersistence = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('📱 Session persistence monitoring active (passive mode)');
    
    // Listen for page visibility changes for logging only
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const permanentData = PermanentSession.getSession();
        console.log('👁️ Tab became visible - permanent session status:', permanentData.isLoggedIn);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);
  
  // No return value needed - this is purely passive monitoring
};
