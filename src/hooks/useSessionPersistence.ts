
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// This hook is now completely passive - no session recovery attempts
// All session management is handled in AuthContext for performance
export const useSessionPersistence = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Passive monitoring only - no recovery attempts
    console.log('📱 Session persistence monitoring active, auth state:', isAuthenticated);
    
    // Listen for page visibility changes to log tab switching
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - session should be instantly available from cache');
      } else {
        console.log('👁️ Tab hidden');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);
  
  // No return value needed - this is purely passive monitoring
};
