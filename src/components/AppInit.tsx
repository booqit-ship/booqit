
import React from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useCapacitor } from "@/hooks/useCapacitor";

/**
 * Component that initializes notifications and native capacitor features.
 * Session persistence is now handled by useSessionPersistence in AppContent.
 * Must be rendered INSIDE <RouterProvider>.
 */
const AppInit: React.FC = () => {
  console.log('🚀 APP INIT: Initializing app components...');
  
  const notificationState = useNotifications(); // Make sure this runs for FCM registration
  useCapacitor();
  
  console.log('📱 APP INIT: Notification state:', {
    isInitialized: notificationState.isInitialized,
    hasPermission: notificationState.hasPermission,
    isSupported: notificationState.isSupported,
    error: notificationState.initializationError
  });
  
  return null;
};

export default AppInit;
