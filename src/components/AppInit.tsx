
import React from "react";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useCapacitor } from "@/hooks/useCapacitor";

/**
 * Component that initializes persisted sessions and native capacitor features.
 * Must be rendered INSIDE <RouterProvider>.
 */
const AppInit: React.FC = () => {
  console.log('🚀 APP INIT: Initializing app components...');
  
  useSessionPersistence();
  useCapacitor();
  
  return null;
};

export default AppInit;
