
import React, { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

const notificationTypes = [
  { type: 'new_booking', label: "New Bookings (merchant)" },
  { type: 'booking_confirmed', label: "Booking Confirmations" },
  { type: 'booking_completed', label: "Completion/Review Reminders" },
  { type: 'upcoming_appointment', label: "Upcoming Appointment Reminders" },
  { type: 'booking_cancelled', label: "Booking Cancellations" },
];

export default function NotificationPreferencesPanel() {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreference } = useNotificationPreferences(user?.id ?? null);

  useEffect(() => {
    console.log('🔔 NOTIFICATION PREFS: Current preferences:', preferences);
    console.log('🔔 NOTIFICATION PREFS: User ID:', user?.id);
  }, [preferences, user?.id]);

  // Initialize default preferences if none exist
  useEffect(() => {
    const initializeDefaultPreferences = async () => {
      if (!user?.id || isLoading) return;
      
      console.log('🔔 NOTIFICATION PREFS: Checking if initialization needed...');
      
      // If no preferences exist, create default ones
      if (preferences && preferences.length === 0) {
        console.log('🔔 NOTIFICATION PREFS: No preferences found, creating defaults...');
        
        for (const notifType of notificationTypes) {
          try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid rate limiting
            updatePreference({ 
              notificationType: notifType.type, 
              enabled: true 
            });
          } catch (error) {
            console.error('Failed to initialize preference:', notifType.type, error);
          }
        }
      }
    };

    initializeDefaultPreferences();
  }, [user?.id, preferences, isLoading, updatePreference]);

  if (!user) {
    return (
      <Card className="max-w-lg mx-auto mt-10">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please log in to manage notification preferences</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="max-w-lg mx-auto mt-10">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Loading notification preferences...</p>
        </CardContent>
      </Card>
    );
  }

  // Create preference map with defaults
  const prefMap = Object.fromEntries(
    notificationTypes.map(nt => {
      const existingPref = preferences?.find((p: any) => p.notification_type === nt.type);
      return [nt.type, existingPref?.enabled ?? true]; // Default to true if not found
    })
  );

  console.log('🔔 NOTIFICATION PREFS: Preference map:', prefMap);

  const handlePreferenceChange = async (notificationType: string, enabled: boolean) => {
    console.log('🔔 NOTIFICATION PREFS: Updating preference:', { notificationType, enabled });
    
    try {
      updatePreference({ notificationType, enabled });
    } catch (error) {
      console.error('🔔 NOTIFICATION PREFS: Failed to update preference:', error);
      toast.error('Failed to update notification preference');
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-10">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <p className="text-sm text-gray-600">
          Manage which notifications you want to receive
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificationTypes.map((nt) => {
            const isEnabled = prefMap[nt.type];
            
            return (
              <div key={nt.type} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-1">
                  <span className="font-medium">{nt.label}</span>
                  <p className="text-sm text-gray-500 mt-1">
                    {nt.type === 'new_booking' && 'Get notified when customers book appointments'}
                    {nt.type === 'booking_confirmed' && 'Get notified when your bookings are confirmed'}
                    {nt.type === 'booking_completed' && 'Get reminded to leave reviews after appointments'}
                    {nt.type === 'upcoming_appointment' && 'Get reminded about upcoming appointments'}
                    {nt.type === 'booking_cancelled' && 'Get notified when bookings are cancelled'}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange(nt.type, checked)}
                  className="ml-4"
                />
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Make sure to allow notifications in your browser settings to receive push notifications.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
