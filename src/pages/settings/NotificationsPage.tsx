
import React from "react";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import NotificationHistoryPanel from "@/components/NotificationHistoryPanel";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NotificationPreferencesPanel />
      <NotificationHistoryPanel />
    </div>
  );
}
