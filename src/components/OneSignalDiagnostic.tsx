
import React, { useState, useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, TestTube, MapPin, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

const OneSignalDiagnostic: React.FC = () => {
  const { 
    requestPermission, 
    showPermissionPrompt, 
    showNativePrompt, 
    forcePermissionPrompt,
    checkSubscriptionStatus,
    getCurrentUserId 
  } = useOneSignal();
  const { userId, userRole } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [subscriptionStatus, setSubscriptionStatus] = useState<boolean>(false);
  const [oneSignalUserId, setOneSignalUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationSetup, setNotificationSetup] = useState<any>(null);

  const refreshStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check browser permission
      if (!Capacitor.isNativePlatform() && window.OneSignal) {
        const permission = await window.OneSignal.Notifications.permission;
        setPermissionStatus(permission);
      } else {
        setPermissionStatus('native');
      }
      
      // Check subscription status
      const isSubscribed = await checkSubscriptionStatus();
      setSubscriptionStatus(isSubscribed);
      
      // Get OneSignal user ID
      const osUserId = await getCurrentUserId();
      setOneSignalUserId(osUserId);
      
      toast.success('Status refreshed');
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationSetup = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('check_notification_setup');
      
      if (error) {
        console.error('Error checking setup:', error);
        toast.error('Failed to check notification setup');
        return;
      }
      
      setNotificationSetup(data);
      toast.success('Setup check completed');
    } catch (error) {
      console.error('Error in setup check:', error);
      toast.error('Setup check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseNotification = async () => {
    try {
      if (!userId) {
        toast.error('You must be logged in to test notifications');
        return;
      }

      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('test_booking_notification', {
        test_merchant_user_id: userId
      });
      
      if (error) {
        console.error('Database test error:', error);
        toast.error('Database test failed: ' + error.message);
      } else {
        console.log('Database test result:', data);
        if (data.success) {
          toast.success('Database test notification sent successfully!');
        } else {
          toast.error('Database test failed: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error in database test:', error);
      toast.error('Failed to test database notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBookingNotification = async () => {
    try {
      setIsLoading(true);
      
      if (!userId) {
        toast.error('You must be logged in to test notifications');
        return;
      }

      console.log('Testing direct Edge Function notification for user:', userId);

      const { data, error } = await supabase.functions.invoke('send-booking-notification', {
        body: {
          bookingId: 'test-direct-' + Date.now(),
          merchantUserId: userId,
          customerName: 'Test Customer',
          serviceName: 'Diagnostic Test Service',
          dateTime: 'Today at ' + new Date().toLocaleTimeString(),
          staffName: 'Test Stylist',
          automated: false
        }
      });

      if (error) {
        console.error('Direct test error:', error);
        toast.error('Direct test failed: ' + error.message);
      } else {
        console.log('Direct test response:', data);
        if (data.success) {
          toast.success('✅ Direct test notification sent! Check your device.');
        } else {
          toast.error('Direct test failed: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error sending direct test notification:', error);
      toast.error('Failed to send direct test notification');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'default': return 'bg-yellow-100 text-yellow-800';
      case 'native': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Bell className="h-5 w-5" />
          OneSignal Diagnostic Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Section */}
        <div className="space-y-3">
          <h3 className="font-medium">Current Status</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-gray-600">Permission:</span>
              <Badge className={getPermissionStatusColor()}>
                {permissionStatus}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-gray-600">Subscribed:</span>
              <Badge className={subscriptionStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {subscriptionStatus ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-gray-600">Platform:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {Capacitor.isNativePlatform() ? 'Native' : 'Web'}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-gray-600">User Role:</span>
              <Badge className="bg-purple-100 text-purple-800">
                {userRole || 'Unknown'}
              </Badge>
            </div>
          </div>
          
          {oneSignalUserId && (
            <div className="text-xs text-gray-500 mt-2">
              OneSignal ID: {oneSignalUserId}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={refreshStatus}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          <Button 
            onClick={requestPermission}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            Request Permission
          </Button>

          <Button 
            onClick={forcePermissionPrompt}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Force All Prompts
          </Button>
        </div>

        {/* Test Section */}
        <div className="space-y-2">
          <h3 className="font-medium">Notification Tests</h3>
          
          <Button 
            onClick={handleTestBookingNotification}
            className="w-full"
            variant="default"
            size="sm"
            disabled={isLoading || !userId}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Test Direct Notification'}
          </Button>
          
          <Button 
            onClick={testDatabaseNotification}
            className="w-full"
            variant="secondary"
            size="sm"
            disabled={isLoading || !userId}
          >
            <Database className="h-4 w-4 mr-2" />
            {isLoading ? 'Testing...' : 'Test Database Trigger'}
          </Button>
          
          <Button 
            onClick={checkNotificationSetup}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-2" />
            Check System Setup
          </Button>
        </div>

        {/* Setup Status */}
        {notificationSetup && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">System Setup Status</h4>
            <div className="space-y-1 text-sm">
              <div>Trigger Exists: <Badge className={notificationSetup.trigger_exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {notificationSetup.trigger_exists ? 'Yes' : 'No'}
              </Badge></div>
              <div>Total Merchants: {notificationSetup.total_merchants}</div>
              <div>Merchants with User ID: {notificationSetup.merchants_with_user_id}</div>
              <div>Recent Bookings (24h): {notificationSetup.recent_bookings_24h}</div>
              <div>Health: <Badge className={notificationSetup.setup_health === 'GOOD' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {notificationSetup.setup_health}
              </Badge></div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Must be logged in as merchant for booking notifications</p>
          <p>• Web users need to accept browser permission prompts</p>
          <p>• Test notifications help verify the complete pipeline</p>
          {!userId && <p className="text-red-500">⚠️ Please log in to test notifications</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default OneSignalDiagnostic;
