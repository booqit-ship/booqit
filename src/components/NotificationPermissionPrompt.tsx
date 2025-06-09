
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPermissionPromptProps {
  onDismiss: () => void;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({ onDismiss }) => {
  const { requestPermissionManually } = useNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestPermissionManually();
    if (granted) {
      onDismiss();
    }
  };

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
