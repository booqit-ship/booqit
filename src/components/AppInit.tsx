
import React from "react";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useNotifications } from "@/hooks/useNotifications";
import { useCapacitor } from "@/hooks/useCapacitor";

/**
 * Component that initializes persisted sessions, notifications,
 * and native capacitor features. Must be rendered INSIDE <RouterProvider>.
 */
const AppInit: React.FC = () => {
  useSessionPersistence();
  useNotifications();
  useCapacitor();
  return null;
};

export default AppInit;
