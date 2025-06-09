
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, User, Bell, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  sent_at: string;
}

const NotificationDebugPanel = () => {
  const { userId } = useAuth();
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDebugData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Load user profile with FCM data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('fcm_token, notification_enabled, last_notification_sent, name, role')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setUserProfile(profile);
      }

      // Load recent notification logs
      const { data: notifications, error: notifError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (notifError) {
        console.error('Error loading notifications:', notifError);
      } else {
        setRecentNotifications(notifications || []);
      }
    } catch (error) {
      console.error('Error loading debug data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDebugData();
  }, [userId]);

  const testRealBookingNotification = async () => {
    if (!userId) return;

    try {
      // Create a test booking to trigger real notification flow
      const testBooking = {
        user_id: userId,
        merchant_id: '550e8400-e29b-41d4-a716-446655440000', // Test merchant ID
        service_id: '550e8400-e29b-41d4-a716-446655440001', // Test service ID
        date: new Date().toISOString().split('T')[0],
        time_slot: '2:00 PM',
        status: 'confirmed',
        payment_status: 'paid',
        customer_name: userProfile?.name || 'Test Customer',
        services: [{ name: 'Test Service', price: 100 }],
        total_duration: 60
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();

      if (error) {
        toast.error('Failed to create test booking: ' + error.message);
      } else {
        toast.success('Test booking created! Check for notification.');
        setTimeout(loadDebugData, 2000); // Reload debug data after 2 seconds
      }
    } catch (error) {
      toast.error('Error creating test booking: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Real-World Notification Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Debug Data:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDebugData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* User Profile Status */}
          {userProfile && (
            <div className="p-4 border rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                User Profile Status
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{userProfile.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Role:</span>
                  <Badge variant="outline" className="ml-2">{userProfile.role}</Badge>
                </div>
                <div>
                  <span className="text-gray-600">FCM Token:</span>
                  <Badge variant={userProfile.fcm_token ? "default" : "destructive"} className="ml-2">
                    {userProfile.fcm_token ? "✅ Present" : "❌ Missing"}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Notifications:</span>
                  <Badge variant={userProfile.notification_enabled ? "default" : "destructive"} className="ml-2">
                    {userProfile.notification_enabled ? "✅ Enabled" : "❌ Disabled"}
                  </Badge>
                </div>
              </div>
              {userProfile.fcm_token && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="font-medium">Token Preview:</span> {userProfile.fcm_token.substring(0, 30)}...
                </div>
              )}
            </div>
          )}

          {/* Test Real Notification Flow */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4" />
              Test Real Notification Flow
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              This will create a real booking which should trigger merchant notification through the real-world notification system.
            </p>
            <Button
              onClick={testRealBookingNotification}
              disabled={!userProfile?.fcm_token}
              className="w-full"
            >
              Create Test Booking & Trigger Real Notification
            </Button>
          </div>

          {/* Recent Notifications */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Database className="h-4 w-4" />
              Recent Notification Logs ({recentNotifications.length})
            </h4>
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-gray-500">No recent notifications found</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-gray-600">{notification.body}</div>
                      <div className="text-gray-500">
                        {notification.type} • {new Date(notification.sent_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge 
                      variant={notification.status === 'sent' ? "default" : notification.status === 'failed' ? "destructive" : "secondary"}
                    >
                      {notification.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {notification.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDebugPanel;
