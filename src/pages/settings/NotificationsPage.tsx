
import React from "react";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import NotificationHistoryPanel from "@/components/NotificationHistoryPanel";
import UnifiedNotificationDebugPanel from "@/components/UnifiedNotificationDebugPanel";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <UnifiedNotificationDebugPanel />
      <NotificationPreferencesPanel />
      <NotificationHistoryPanel />
    </div>
  );
}
