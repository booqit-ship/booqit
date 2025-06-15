
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useState } from 'react';

const NotificationBanner = () => {
  const { hasPermission, isSupported, requestPermissionManually } = useNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if notifications are supported and permission is granted, or if dismissed
  if (!isSupported || hasPermission || isDismissed) {
    return null;
  }

  return (
    <Card className="mx-4 mb-4 border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">
                Enable notifications for booking updates
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Get notified about new bookings, confirmations, and reminders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={requestPermissionManually}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="text-orange-600 hover:text-orange-700 p-1 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationBanner;
