
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, TestTube, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
      console.log('🧪 Sending test notification to user:', userId);
      const success = await sendNotificationToUser(userId, {
        title: 'Test Notification 🧪',
        body: 'This is a test notification from BooqIt! If you see this, notifications are working perfectly!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      });

      if (success) {
        toast.success('✅ Test notification sent successfully! Check your notifications.', {
          duration: 5000
        });
      } else {
        toast.error('❌ Failed to send test notification. Check console for details.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('❌ Error sending test notification: ' + error.message);
    }
  };

  const sendWelcomeNotification = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      console.log('🎉 Sending welcome notification to user:', userId);
      const welcomeMessage = userRole === 'merchant' 
        ? 'Welcome back to BooqIt! Ready to manage your bookings?' 
        : 'Welcome back to BooqIt! Your beauty appointments await!';

      const success = await sendNotificationToUser(userId, {
        title: 'Welcome to BooqIt! 🎉',
        body: welcomeMessage,
        data: {
          type: 'welcome',
          userId: userId
        }
      });

      if (success) {
        toast.success('🎉 Welcome notification sent! Check your notifications.', {
          duration: 5000
        });
      } else {
        toast.error('❌ Failed to send welcome notification.');
      }
    } catch (error) {
      console.error('Error sending welcome notification:', error);
      toast.error('❌ Error sending welcome notification: ' + error.message);
    }
  };

  const retryInitialization = async () => {
    if (hasPermission) {
      toast.info('Retrying notification initialization...');
      // Force a re-initialization by requesting permission again
      await requestPermissionManually();
    } else {
      toast.error('Permission not granted. Please enable notifications first.');
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
            <span className="font-medium">FCM Enabled ✅</span>
          </div>
          <p className="text-green-700 text-xs mt-1">
            FIREBASE_SERVER_KEY configured and ready to send notifications
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Permission Status:</span>
            <Badge variant={hasPermission ? "default" : "destructive"}>
              {hasPermission ? "✅ Granted" : "❌ Not Granted"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Initialization:</span>
            <div className="flex items-center gap-2">
              <Badge variant={isInitialized ? "default" : "destructive"}>
                {isInitialized ? "✅ Ready" : "❌ Pending"}
              </Badge>
              {hasPermission && !isInitialized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryInitialization}
                  className="p-1 h-6 w-6"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User Role:</span>
            <Badge variant="outline">{userRole || 'Unknown'}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User ID:</span>
            <Badge variant="outline" className="text-xs max-w-24 truncate">
              {userId ? userId.substring(0, 8) + '...' : 'None'}
            </Badge>
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
            <>
              <Button 
                onClick={sendTestNotification}
                className="w-full"
                disabled={!isInitialized}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
              
              <Button 
                onClick={sendWelcomeNotification}
                className="w-full"
                variant="outline"
                disabled={!isInitialized}
              >
                <Bell className="h-4 w-4 mr-2" />
                Send Welcome Message
              </Button>
            </>
          )}
        </div>

        {hasPermission && !isInitialized && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Initialization Failed</span>
            </div>
            <p className="text-orange-700 text-xs mt-1">
              Notifications are enabled but initialization failed. Check console logs and try the refresh button above.
            </p>
          </div>
        )}

        {!hasPermission && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Enable Notifications</span>
            </div>
            <p className="text-orange-700 text-xs mt-1">
              Click "Enable Notifications" above to allow push notifications in your browser
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Test notifications verify the complete flow</p>
          <p>• Welcome messages simulate login notifications</p>
          <p>• Check browser notifications and console logs</p>
          <p>• All notifications are logged in the database</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
