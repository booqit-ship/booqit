
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Send, TestTube, CheckCircle, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToUser } from '@/services/notificationService';
import { getFCMToken } from '@/firebase';
import { toast } from 'sonner';

const NotificationTestPanel = () => {
  const { isInitialized, hasPermission, requestPermissionManually } = useNotifications();
  const { userId, userRole } = useAuth();
  const [fcmToken, setFcmToken] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('Custom Test Notification 🧪');
  const [customMessage, setCustomMessage] = useState('This is a custom test message from BooqIt!');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🔔 Starting notification enablement process...');
      const success = await requestPermissionManually();
      
      if (success) {
        // Get the FCM token for display
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          console.log('🔑 FCM Token obtained:', token);
        }
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      toast.error('Failed to enable notifications: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🧪 Sending test notification to user:', userId);
      console.log('📋 Notification payload:', { title: customTitle, body: customMessage });
      
      const success = await sendNotificationToUser(userId, {
        title: customTitle,
        body: customMessage,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
          testId: Math.random().toString(36).substr(2, 9)
        }
      });

      if (success) {
        toast.success('✅ Test notification sent successfully! Check your notifications.', {
          duration: 5000
        });
        console.log('✅ Test notification sent successfully');
      } else {
        toast.error('❌ Failed to send test notification. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      toast.error('❌ Error sending test notification: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendWelcomeNotification = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
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
          userId: userId,
          timestamp: new Date().toISOString()
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
      console.error('❌ Error sending welcome notification:', error);
      toast.error('❌ Error sending welcome notification: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyTokenToClipboard = async () => {
    if (fcmToken) {
      await navigator.clipboard.writeText(fcmToken);
      toast.success('FCM token copied to clipboard!');
    }
  };

  const refreshToken = async () => {
    try {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        toast.success('FCM token refreshed!');
      }
    } catch (error) {
      toast.error('Failed to refresh token: ' + error.message);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Notification Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 text-sm mb-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">FCM v1 API Enabled ✅</span>
          </div>
          <p className="text-green-700 text-xs">
            FIREBASE_SERVICE_ACCOUNT configured and ready to send notifications via FCM v1 API
          </p>
        </div>

        {/* Permission and Initialization Status */}
        <div className="space-y-3">
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
                  onClick={handleEnableNotifications}
                  className="p-1 h-6 w-6"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
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
            <Badge variant="outline" className="text-xs max-w-32 truncate">
              {userId ? userId.substring(0, 8) + '...' : 'None'}
            </Badge>
          </div>
        </div>

        {/* FCM Token Display */}
        {hasPermission && fcmToken && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">FCM Token:</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTokenToClipboard}
                  className="p-1 h-6 w-6"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshToken}
                  className="p-1 h-6 w-6"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-blue-600 font-mono break-all">
              {fcmToken.substring(0, 50)}...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!hasPermission && (
            <Button 
              onClick={handleEnableNotifications}
              className="w-full"
              variant="outline"
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
          )}
          
          {hasPermission && (
            <>
              {/* Custom Notification Form */}
              <div className="space-y-3 p-4 border rounded-lg">
                <h3 className="text-sm font-medium">Custom Test Notification</h3>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="title" className="text-xs">Title</Label>
                    <Input
                      id="title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Notification title"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message" className="text-xs">Message</Label>
                    <Textarea
                      id="message"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Notification message"
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
                <Button 
                  onClick={sendTestNotification}
                  className="w-full"
                  disabled={!isInitialized || isLoading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Custom Test'}
                </Button>
              </div>
              
              <Button 
                onClick={sendWelcomeNotification}
                className="w-full"
                variant="outline"
                disabled={!isInitialized || isLoading}
              >
                <Bell className="h-4 w-4 mr-2" />
                {isLoading ? 'Sending...' : 'Send Welcome Message'}
              </Button>
            </>
          )}
        </div>

        {/* Error/Warning Messages */}
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

        {/* Debug Information */}
        <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
          <p>• Custom notifications allow you to test with your own content</p>
          <p>• Welcome messages simulate login notifications</p>
          <p>• All notifications are logged in the notification_logs table</p>
          <p>• Check browser notifications and console logs for debugging</p>
          <p>• FCM token is used to identify this device for notifications</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
