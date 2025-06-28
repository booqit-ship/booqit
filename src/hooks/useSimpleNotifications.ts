
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Simplified notification hook - no Firebase/FCM needed for email auth
export const useSimpleNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // For email-only auth, we don't need push notifications
    // This can be implemented later if needed
    setIsRegistered(true);
    setIsLoading(false);
  }, [isAuthenticated]);

  return {
    isRegistered,
    isLoading,
    registerForNotifications: () => Promise.resolve(),
    forceRefreshTokens: () => Promise.resolve(),
    retryAttempts: 0,
    canRetry: true
  };
};
