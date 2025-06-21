
import { useEffect } from 'react';

// Simplified session persistence - now handled by UnifiedAuthManager
export const useSessionPersistence = () => {
  useEffect(() => {
    console.log('📱 Session persistence is now handled by UnifiedAuthManager');
    // All session management is now centralized in UnifiedAuthManager
    // This hook is kept for compatibility but does nothing
  }, []);
};
