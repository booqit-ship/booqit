
import React, { useState, useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, TestTube, MapPin, AlertCircle, RefreshCw, Database, User, Settings } from 'lucide-react';
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
    getCurrentUserId,
    getSubscriptionDetails,
    resetAndSetupUser
  } = useOneSignal();
  const { userId, userRole } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [subscriptionStatus, setSubscriptionStatus] = useState<boolean>(false);
  const [oneSignalUserId, setOneSignalUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

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
      
      // Get detailed subscription information
      const details = await getSubscriptionDetails();
      setSubscriptionDetails(details);
      
      console.log('🔔 Diagnostic refresh - Permission:', permissionStatus, 'Subscribed:', isSubscribed, 'UserId:', osUserId, 'Details:', details);
      
      toast.success('Status refreshed');
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      setIsLoading(true);
      
      // Check merchants with user IDs
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select('id, user_id')
        .not('user_id', 'is', null);
      
      if (merchantError) {
        console.error('Error checking merchants:', merchantError);
        toast.error('Failed to check merchant data');
        return;
      }
      
      // Check recent bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (bookingError) {
        console.error('Error checking bookings:', bookingError);
        toast.error('Failed to check booking data');
        return;
      }
      
      setSystemHealth({
        merchants_with_user_id: merchants?.length || 0,
        recent_bookings_24h: bookings?.length || 0,
        setup_health: merchants && merchants.length > 0 ? 'GOOD' : 'NO_MERCHANT_USER_IDS'
      });
      
      toast.success('System health check completed');
    } catch (error) {
      console.error('Error in system health check:', error);
      toast.error('System health check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectNotification = async () => {
    try {
      if (!userId) {
        toast.error('You must be logged in to test notifications');
        return;
      }

      setIsLoading(true);
      
      console.log('🔔 Testing direct Edge Function notification for user:', userId);

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
        if (data?.success) {
          toast.success('✅ Direct test notification sent! Check your device.');
        } else {
          toast.error('Direct test failed: ' + (data?.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error sending direct test notification:', error);
      toast.error('Failed to send direct test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseTrigger = async () => {
    try {
      if (!userId || userRole !== 'merchant') {
        toast.error('You must be logged in as a merchant to test database triggers');
        return;
      }

      setIsLoading(true);
      
      console.log('🔔 Testing database trigger by creating a test booking...');

      // Get merchant record for the logged-in user
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (merchantError) {
        console.error('Merchant lookup error:', merchantError);
        toast.error('Could not find merchant record for user');
        return;
      }

      // Get a service for the merchant
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('merchant_id', merchantData.id)
        .limit(1)
        .single();

      if (serviceError) {
        console.error('Service lookup error:', serviceError);
        toast.error('No services found for merchant - create a service first');
        return;
      }

      // Get a staff member for the merchant
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('merchant_id', merchantData.id)
        .limit(1)
        .single();

      if (staffError) {
        console.error('Staff lookup error:', staffError);
        toast.error('No staff found for merchant - create a staff member first');
        return;
      }

      // Create a test booking to trigger the notification
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          merchant_id: merchantData.id,
          service_id: serviceData.id,
          staff_id: staffData.id,
          date: new Date().toISOString().split('T')[0],
          time_slot: '10:00',
          status: 'confirmed',
          payment_status: 'pending',
          customer_name: 'Database Test Customer',
          customer_email: 'test@example.com',
          customer_phone: '1234567890'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        toast.error('Failed to create test booking: ' + bookingError.message);
        return;
      }

      console.log('🔔 Test booking created:', bookingData);
      toast.success('✅ Test booking created! Database trigger should send notification. Check your device.');

      // Clean up the test booking after a few seconds
      setTimeout(async () => {
        await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingData.id);
        console.log('🔔 Test booking cleaned up');
      }, 5000);

    } catch (error) {
      console.error('Error testing database trigger:', error);
      toast.error('Failed to test database trigger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetUser = async () => {
    try {
      setIsLoading(true);
      await resetAndSetupUser();
      await refreshStatus(); // Refresh after reset
    } catch (error) {
      console.error('Error resetting user:', error);
      toast.error('Failed to reset user setup');
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

          {subscriptionDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs">
              <h4 className="font-medium mb-2">Subscription Details</h4>
              <div className="space-y-1">
                <div>OneSignal ID: {subscriptionDetails.onesignalId || 'None'}</div>
                <div>External ID: {subscriptionDetails.externalId || 'None'}</div>
                <div>Push Token: {subscriptionDetails.token ? 'Present' : 'Missing'}</div>
                <div>Opted In: {subscriptionDetails.optedIn ? 'Yes' : 'No'}</div>
              </div>
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

          <Button 
            onClick={handleResetUser}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading || !userId}
          >
            <User className="h-4 w-4 mr-2" />
            Reset User Setup
          </Button>
        </div>

        {/* Test Section */}
        <div className="space-y-2">
          <h3 className="font-medium">Notification Tests</h3>
          
          <Button 
            onClick={testDirectNotification}
            className="w-full"
            variant="default"
            size="sm"
            disabled={isLoading || !userId}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Test Direct Notification'}
          </Button>

          <Button 
            onClick={testDatabaseTrigger}
            className="w-full"
            variant="secondary"
            size="sm"
            disabled={isLoading || !userId || userRole !== 'merchant'}
          >
            <Database className="h-4 w-4 mr-2" />
            {isLoading ? 'Testing...' : 'Test Database Trigger'}
          </Button>
          
          <Button 
            onClick={checkSystemHealth}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-2" />
            Check System Health
          </Button>
        </div>

        {/* System Health Status */}
        {systemHealth && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">System Health Status</h4>
            <div className="space-y-1 text-sm">
              <div>Merchants with User ID: {systemHealth.merchants_with_user_id}</div>
              <div>Recent Bookings (24h): {systemHealth.recent_bookings_24h}</div>
              <div>Health: <Badge className={systemHealth.setup_health === 'GOOD' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {systemHealth.setup_health}
              </Badge></div>
            </div>
          </div>
        )}

        {/* Critical Issues Warning */}
        {(!subscriptionStatus || !oneSignalUserId || permissionStatus !== 'granted') && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Critical Issues Detected</h4>
            <div className="space-y-1 text-sm text-red-700">
              {permissionStatus !== 'granted' && <div>• Browser permission not granted</div>}
              {!subscriptionStatus && <div>• Not subscribed to push notifications</div>}
              {!oneSignalUserId && <div>• OneSignal user ID not set</div>}
              {userRole === 'merchant' && <div>• Merchant will NOT receive booking notifications</div>}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Must be logged in as merchant for booking notifications</p>
          <p>• Web users need to accept browser permission prompts</p>
          <p>• External User ID must match your logged-in user ID</p>
          <p>• Test notifications help verify the complete pipeline</p>
          <p>• Database trigger test creates a real booking to test the flow</p>
          {!userId && <p className="text-red-500">⚠️ Please log in to test notifications</p>}
          {userRole !== 'merchant' && userId && <p className="text-red-500">⚠️ Must be merchant to test database triggers</p>}
          {userRole === 'merchant' && !subscriptionStatus && <p className="text-red-500">⚠️ CRITICAL: Merchant not subscribed - will miss booking alerts!</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default OneSignalDiagnostic;
