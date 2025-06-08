
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, TestTube, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToUser } from '@/services/notificationService';
import { toast } from 'sonner';

const NotificationTestPanel = () => {
  const { isInitialized, hasPermission, requestPermissionManually } = useNotifications();
  const { userId, userRole } = useAuth();

  const sendTestNotification = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const success = await sendNotificationToUser(userId, {
        title: 'Test Notification 🧪',
        body: 'This is a test notification from BooqIt!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      });

      if (success) {
        toast.success('Test notification sent successfully! 🎉');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending test notification');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Notification Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Migration Applied ✅</span>
          </div>
          <p className="text-green-700 text-xs mt-1">
            FCM support is now fully enabled and ready to use
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Permission Status:</span>
            <Badge variant={hasPermission ? "default" : "destructive"}>
              {hasPermission ? "Granted" : "Not Granted"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Initialization:</span>
            <Badge variant={isInitialized ? "default" : "secondary"}>
              {isInitialized ? "Ready" : "Pending"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User Role:</span>
            <Badge variant="outline">{userRole}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          {!hasPermission && (
            <Button 
              onClick={requestPermissionManually}
              className="w-full"
              variant="outline"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          )}
          
          {hasPermission && (
            <Button 
              onClick={sendTestNotification}
              className="w-full"
              disabled={!isInitialized}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Login triggers welcome notification</p>
          <p>• Booking triggers merchant notification</p>
          <p>• Completion triggers review request</p>
          <p>• Weekly reminders for customers</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
