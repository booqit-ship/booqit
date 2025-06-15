
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

export default function MerchantNotificationBanner() {
  const { userRole } = useAuth();
  const { isInitialized, hasPermission, isSupported, requestPermissionManually } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Only show for merchants who haven't initialized notifications
  if (userRole !== 'merchant' || isInitialized || dismissed || !isSupported) {
    return null;
  }

  const handleEnable = async () => {
    const success = await requestPermissionManually();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Enable Booking Notifications
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Get instant alerts when customers book appointments with you.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleEnable}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Enable Now
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="sm"
            className="text-blue-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
