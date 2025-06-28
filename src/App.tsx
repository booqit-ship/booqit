
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleNotifications } from '@/hooks/useSimpleNotifications';
import { TokenCleanupService } from '@/services/TokenCleanupService';
import AppContent from '@/components/AppContent';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isRegistered } = useSimpleNotifications();

  // Clean up tokens on app start
  useEffect(() => {
    TokenCleanupService.cleanupExpiredTokens();
  }, []);

  return <AppContent />;
};

export default App;
