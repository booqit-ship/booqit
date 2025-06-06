
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCurrentSession } from '@/utils/sessionRecovery';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && !loading && isAuthenticated) {
        console.log('Tab became visible, validating session...');
        await validateCurrentSession();
      }
    };

    const handleFocus = async () => {
      if (!loading && isAuthenticated) {
        console.log('Window focused, validating session...');
        await validateCurrentSession();
      }
    };

    // Add event listeners for tab visibility and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, loading]);
};
