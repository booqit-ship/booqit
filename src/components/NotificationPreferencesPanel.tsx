
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSimpleNotifications } from "@/hooks/useSimpleNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

export default function NotificationPreferencesPanel() {
  const { userId, userRole } = useAuth();
  const { isInitialized, hasPermission, enableNotifications } = useSimpleNotifications();
  const { preferences, isLoading, updatePreference } = useNotificationPreferences(userId);

  // Get preference by type
  const getPreferenceEnabled = (type: string) => {
    const pref = preferences.find(p => p.notification_type === type);
    return pref?.enabled ?? true; // Default to enabled
  };

  const notificationTypes = [
    {
      type: 'new_booking',
      label: 'New Bookings',
      description: 'Get notified when customers book appointments',
      merchantOnly: true
    },
    {
      type: 'booking_confirmed',
      label: 'Booking Confirmations',
      description: 'Get notified when your booking is confirmed',
      customerOnly: true
    },
    {
      type: 'booking_completed',
      label: 'Review Requests',
      description: 'Get notified to leave reviews after appointments',
      customerOnly: true
    },
    {
      type: 'daily_reminder',
      label: 'Daily Reminders',
      description: 'Get daily reminders about your business or bookings'
    },
    {
      type: 'weekly_reminder',
      label: 'Weekly Reminders',
      description: 'Get weekly reminders to book appointments',
      customerOnly: true
    }
  ];

  const filteredTypes = notificationTypes.filter(type => {
    if (type.merchantOnly && userRole !== 'merchant') return false;
    if (type.customerOnly && userRole !== 'customer') return false;
    return true;
  });

  const handleTogglePreference = (type: string, enabled: boolean) => {
    updatePreference({ notificationType: type, enabled });
  };

  if (isLoading) {
    return (
      <Card className="mx-4 mb-4">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Notification Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">
                  {isInitialized ? "Notifications Enabled" : "Enable Notifications"}
                </p>
                <p className="text-sm text-gray-600">
                  {isInitialized 
                    ? "You'll receive notifications for important updates" 
                    : "Allow notifications to stay updated on bookings and reminders"
                  }
                </p>
              </div>
            </div>
            {!isInitialized && (
              <Button 
                onClick={enableNotifications}
                size="sm"
              >
                Enable
              </Button>
            )}
          </div>

          {!hasPermission && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Browser Permission Required:</strong> Please allow notifications in your browser to receive updates.
              </p>
            </div>
          )}
        </div>

        {/* Individual Notification Preferences */}
        {isInitialized && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Notification Types</h3>
            <div className="space-y-3">
              {filteredTypes.map((type) => (
                <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </div>
                  <Switch
                    checked={getPreferenceEnabled(type.type)}
                    onCheckedChange={(enabled) => handleTogglePreference(type.type, enabled)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p><strong>Status:</strong> {isInitialized ? 'Active' : 'Inactive'}</p>
          <p><strong>Permission:</strong> {hasPermission ? 'Granted' : 'Not granted'}</p>
          {userRole && <p><strong>Role:</strong> {userRole}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
