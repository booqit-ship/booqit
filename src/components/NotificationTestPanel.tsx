
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Send, TestTube, CheckCircle, AlertCircle, RefreshCw, Copy, Settings } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToUser } from '@/services/notificationService';
import { getFCMToken, requestNotificationPermission } from '@/firebase';
import { toast } from 'sonner';

const NotificationTestPanel = () => {
  const { isInitialized, hasPermission, requestPermissionManually } = useNotifications();
  const { userId, userRole } = useAuth();
  const [fcmToken, setFcmToken] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('Custom Test Notification 🧪');
  const [customMessage, setCustomMessage] = useState('This is a custom test message from BooqIt!');
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('');

  // Check permission status on mount and set up interval to monitor
  useEffect(() => {
    const checkPermission = () => {
      const status = Notification.permission;
      setPermissionStatus(status);
      console.log('🔔 Permission check:', status);
    };

    checkPermission();
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load FCM token when permission is granted
  useEffect(() => {
    const loadToken = async () => {
      if (hasPermission && !fcmToken) {
        try {
          const token = await getFCMToken();
          if (token) {
            setFcmToken(token);
          }
        } catch (error) {
          console.error('Error loading FCM token:', error);
        }
      }
    };
    
    loadToken();
  }, [hasPermission, fcmToken]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🔔 Starting notification enablement process...');
      
      // First request browser permission
      const browserPermission = await requestNotificationPermission();
      if (!browserPermission) {
        toast.error('Browser notification permission denied. Please check your browser settings.');
        return;
      }

      // Then initialize with our system
      const success = await requestPermissionManually();
      
      if (success) {
        // Get the FCM token for display
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          console.log('🔑 FCM Token obtained:', token);
          toast.success('🔔 Notifications enabled successfully! You should see a test notification.');
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
        toast.success('✅ Test notification sent! Check for browser notification.', {
          duration: 8000
        });
        console.log('✅ Test notification sent successfully');
        
        // Also create a local test notification for immediate feedback
        if (Notification.permission === 'granted') {
          new Notification('Local Test: ' + customTitle, {
            body: customMessage + ' (This is a local test notification)',
            icon: '/icons/icon-192.png',
            tag: 'local-test'
          });
        }
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
        toast.success('🎉 Welcome notification sent! Check for browser notification.', {
          duration: 8000
        });
        
        // Also create a local test notification
        if (Notification.permission === 'granted') {
          new Notification('Welcome to BooqIt! 🎉', {
            body: welcomeMessage + ' (Local test)',
            icon: '/icons/icon-192.png',
            tag: 'welcome-test'
          });
        }
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

  const openBrowserSettings = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      toast('On mobile: Go to Settings → Site Settings → Notifications → Allow', {
        duration: 10000
      });
    } else {
      toast('Desktop: Click the lock/info icon in the address bar → Notifications → Allow', {
        duration: 10000
      });
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
          Browser Notification Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Permission Status */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Browser Permission:</span>
            <div className="flex items-center gap-2">
              <Badge variant={permissionStatus === 'granted' ? "default" : "destructive"}>
                {permissionStatus === 'granted' ? "✅ Granted" : 
                 permissionStatus === 'denied' ? "❌ Denied" : 
                 "⏳ Not Asked"}
              </Badge>
              {permissionStatus === 'denied' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openBrowserSettings}
                  className="p-1 h-6"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">System Status:</span>
            <Badge variant={isInitialized ? "default" : "destructive"}>
              {isInitialized ? "✅ Ready" : "❌ Pending"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User Role:</span>
            <Badge variant="outline">{userRole || 'Unknown'}</Badge>
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
          {permissionStatus !== 'granted' && (
            <Button 
              onClick={handleEnableNotifications}
              className="w-full"
              variant="outline"
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? 'Enabling...' : 'Enable Browser Notifications'}
            </Button>
          )}
          
          {permissionStatus === 'granted' && (
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
                  {isLoading ? 'Sending...' : 'Send Test Notification'}
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

        {/* Status Messages */}
        {permissionStatus === 'denied' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Notifications Blocked</span>
            </div>
            <p className="text-red-700 text-xs mt-1">
              Please enable notifications in your browser settings and refresh the page.
            </p>
          </div>
        )}

        {permissionStatus === 'granted' && !isInitialized && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">System Initialization Pending</span>
            </div>
            <p className="text-orange-700 text-xs mt-1">
              Browser permission granted but system initialization failed. Try refreshing the page.
            </p>
          </div>
        )}

        {/* Debug Information */}
        <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
          <p>🔔 <strong>Testing Steps:</strong></p>
          <p>1. Click "Enable Browser Notifications" and allow permission</p>
          <p>2. Use "Send Test Notification" - you should see it in browser</p>
          <p>3. Check browser console for detailed logs</p>
          <p>4. Try with app in background vs foreground</p>
          <p>• Foreground: Shows as browser notification immediately</p>
          <p>• Background: Handled by service worker</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
