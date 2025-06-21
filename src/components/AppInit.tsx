
import React from "react";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useNotifications } from "@/hooks/useNotifications";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useTabFocus } from "@/hooks/useTabFocus";

/**
 * Component that initializes persisted sessions, notifications,
 * native capacitor features, and tab focus handling. Must be rendered INSIDE <RouterProvider>.
 */
const AppInit: React.FC = () => {
  console.log('🚀 APP INIT: Initializing app components...');
  
  useSessionPersistence();
  const notificationState = useNotifications(); // Make sure this runs for FCM registration
  useCapacitor();
  useTabFocus(); // Add tab focus handling
  
  console.log('📱 APP INIT: Notification state:', {
    isInitialized: notificationState.isInitialized,
    hasPermission: notificationState.hasPermission,
    isSupported: notificationState.isSupported,
    error: notificationState.initializationError
  });
  
  return null;
};

export default AppInit;
