
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';

const GlobalNotificationBanner = () => {
  const { requestPermissionManually } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);

  // Always check actual browser permission, not just React state
  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    // Check permission on mount and when window regains focus
    checkPermission();
    window.addEventListener('focus', checkPermission);
    
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  // Don't show banner if:
  // - User is not authenticated
  // - Notifications are not supported
  // - Permission is already granted
  // - User has dismissed the banner
  if (!isAuthenticated || !('Notification' in window) || permission === 'granted' || isDismissed) {
    return null;
  }

  const handleEnableNotifications = async () => {
    const granted = await requestPermissionManually();
    if (granted) {
      setPermission('granted');
      setIsDismissed(true);
    }
  };

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
              onClick={handleEnableNotifications}
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
