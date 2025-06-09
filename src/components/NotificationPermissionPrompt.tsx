
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPermissionPromptProps {
  onDismiss: () => void;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({ onDismiss }) => {
  const { requestPermissionManually } = useNotifications();
  const [permission, setPermission] = useState(Notification.permission);

  // Keep permission state synced with actual browser state
  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    checkPermission();
    window.addEventListener('focus', checkPermission);
    
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  // Don't show if permission is already granted
  if (permission === 'granted') {
    return null;
  }

  const handleEnableNotifications = async () => {
    const granted = await requestPermissionManually();
    if (granted) {
      setPermission('granted');
      onDismiss();
    }
  };

  // If permission is denied, show help message
  if (permission === 'denied') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg text-red-900">Notifications Blocked</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-red-800 mb-4">
            Notifications are currently blocked for this site. To receive booking updates, confirmations, and reminders, please enable them manually in your browser settings.
          </CardDescription>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.open('https://support.google.com/chrome/answer/3220216', '_blank')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Learn How to Enable
            </Button>
            <Button 
              variant="outline" 
              onClick={onDismiss}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: show enable button for 'default' permission state
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-900">Enable Notifications</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-orange-600 hover:text-orange-700 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-orange-800 mb-4">
          Get instant notifications for booking updates, confirmations, and reminders to never miss an appointment.
        </CardDescription>
        <div className="flex gap-2">
          <Button 
            onClick={handleEnableNotifications}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Enable Notifications
          </Button>
          <Button 
            variant="outline" 
            onClick={onDismiss}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPermissionPrompt;
