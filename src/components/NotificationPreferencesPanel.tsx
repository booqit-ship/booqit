
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

const notificationTypes = [
  { type: 'new_booking', label: "New Bookings (merchant)" },
  { type: 'booking_confirmed', label: "Booking Confirmations" },
  { type: 'booking_completed', label: "Completion/Review Reminders" },
  { type: 'upcoming_appointment', label: "Upcoming Appointment Reminders" },
  { type: 'booking_cancelled', label: "Booking Cancellations" },
  // Add more as needed
];

export default function NotificationPreferencesPanel() {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreference } = useNotificationPreferences(user?.id ?? null);

  if (!user) return null;
  if (isLoading) {
    return <div>Loading notification preferences...</div>;
  }

  const prefMap = Object.fromEntries((preferences || []).map((p: any) => [p.notification_type, p.enabled]));

  return (
    <Card className="max-w-lg mx-auto mt-10">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        {notificationTypes.map((nt) => (
          <div key={nt.type} className="flex items-center justify-between py-3 border-b last:border-0">
            <span>{nt.label}</span>
            <Switch
              checked={!!prefMap[nt.type]}
              onCheckedChange={(v: boolean) => updatePreference({ notificationType: nt.type, enabled: v })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
