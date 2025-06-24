import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleNotifications } from '@/hooks/useSimpleNotifications';
import { TokenCleanupService } from '@/services/TokenCleanupService';

function App() {
  const { isAuthenticated } = useAuth();
  const { isRegistered } = useSimpleNotifications();

  // Clean up tokens on app start
  useEffect(() => {
    TokenCleanupService.cleanupExpiredTokens();
  }, []);

  return (
    <div>
      {/* Your existing app components and routes go here */}
    </div>
  );
}

export default App;
