
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, TestTube, User } from 'lucide-react';
import { toast } from 'sonner';
import { sendNewBookingNotification } from '@/services/eventNotificationService';

export default function NotificationTestPage() {
  const { user, userRole, userId } = useAuth();
  const { 
    isInitialized, 
    hasPermission, 
    isSupported, 
    requestPermissionManually,
    initializationError 
  } = useNotifications();
  
  const [isTestingBooking, setIsTestingBooking] = useState(false);

  const handleEnableNotifications = async () => {
    console.log('🔔 TEST PAGE: Manually enabling notifications');
    const success = await requestPermissionManually();
    if (success) {
      toast.success('Notifications enabled successfully! 🔔');
    } else {
      toast.error('Failed to enable notifications');
    }
  };

  const handleTestBookingNotification = async () => {
    if (!userId) {
      toast.error('Not authenticated');
      return;
    }

    setIsTestingBooking(true);
    try {
      console.log('🧪 TEST PAGE: Testing booking notification for user:', userId);
      
      // Send a test booking notification to the current user
      await sendNewBookingNotification(
        userId, // Send to current user as merchant
        'Test Customer',
        'Test Service',
        'Tomorrow at 2:00 PM',
        'test-booking-id-123'
      );
      
      toast.success('Test booking notification sent! Check your browser for the notification.');
    } catch (error) {
      console.error('❌ TEST PAGE: Error sending test notification:', error);
      toast.error('Failed to send test notification: ' + error.message);
    } finally {
      setIsTestingBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Notification Test Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>Current User: {user?.user_metadata?.name || 'Unknown'}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {userRole}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Notification Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isInitialized ? (
                <>
                  <Bell className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Notifications Active</span>
                </>
              ) : (
                <>
                  <BellOff className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-600">Notifications Not Enabled</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Browser Support:</span>
                <span className={`ml-2 ${isSupported ? 'text-green-600' : 'text-red-600'}`}>
                  {isSupported ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Permission:</span>
                <span className={`ml-2 ${hasPermission ? 'text-green-600' : 'text-orange-600'}`}>
                  {hasPermission ? '✅ Granted' : '⚠️ Not granted'}
                </span>
              </div>
              <div>
                <span className="font-medium">Initialized:</span>
                <span className={`ml-2 ${isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                  {isInitialized ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div>
                <span className="font-medium">User ID:</span>
                <span className="ml-2 text-xs text-gray-600">
                  {userId ? userId.substring(0, 8) + '...' : 'None'}
                </span>
              </div>
            </div>

            {initializationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Error:</strong> {initializationError}
              </div>
            )}

            {!isInitialized && isSupported && (
              <Button 
                onClick={handleEnableNotifications}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={handleTestBookingNotification}
                disabled={!isInitialized || isTestingBooking}
                className="w-full"
                variant={isInitialized ? "default" : "secondary"}
              >
                {isTestingBooking ? (
                  'Sending Test Notification...'
                ) : (
                  'Test Booking Notification'
                )}
              </Button>
              
              {!isInitialized && (
                <p className="text-sm text-gray-600">
                  💡 Enable notifications first to test them
                </p>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded text-sm">
              <h4 className="font-medium mb-2">How to test:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Click "Enable Notifications" and allow browser permission</li>
                <li>Click "Test Booking Notification" to send a test notification</li>
                <li>You should see a browser notification appear</li>
                <li>Check the browser console for detailed logs</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
