
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// This hook is now simplified since session persistence 
// is handled directly in AuthContext for better performance
export const useSessionPersistence = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Session persistence is now handled in AuthContext
    // This hook remains for backward compatibility but does minimal work
    console.log('📱 Session persistence active, auth state:', isAuthenticated);
  }, [isAuthenticated]);
};
