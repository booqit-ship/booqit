
import React from "react";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import NotificationHistoryPanel from "@/components/NotificationHistoryPanel";
import MerchantNotificationTestPanel from "@/components/MerchantNotificationTestPanel";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NotificationPreferencesPanel />
      <MerchantNotificationTestPanel />
      <NotificationHistoryPanel />
    </div>
  );
}
