
import React from "react";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useSimpleNotifications } from "@/hooks/useSimpleNotifications";
import { useCapacitor } from "@/hooks/useCapacitor";

/**
 * Component that initializes persisted sessions, notifications,
 * and native capacitor features. Must be rendered INSIDE <RouterProvider>.
 */
const AppInit: React.FC = () => {
  console.log('🚀 APP INIT: Initializing app components...');
  
  useSessionPersistence();
  const notificationState = useSimpleNotifications();
  useCapacitor();
  
  console.log('📱 APP INIT: Notification state:', {
    isRegistered: notificationState.isRegistered,
    isLoading: notificationState.isLoading
  });
  
  return null;
};

export default AppInit;
