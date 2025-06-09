
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const GlobalNotificationBanner = () => {
  const { hasPermission, isSupported, requestPermissionManually } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show banner if user is authenticated, notifications are supported, permission not granted, and not dismissed
  if (!isAuthenticated || !isSupported || hasPermission || isDismissed) {
    return null;
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">
                Enable notifications for booking updates and reminders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={requestPermissionManually}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1"
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="text-orange-600 hover:text-orange-700 p-1 h-7 w-7"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalNotificationBanner;
