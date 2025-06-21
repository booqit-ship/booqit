
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConsolidatedNotificationService } from '@/services/consolidatedNotificationService';

interface NotificationDebugPanelProps {
  merchantId: string;
}

const NotificationDebugPanel: React.FC<NotificationDebugPanelProps> = ({ merchantId }) => {
  const [testUserId, setTestUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkCustomerNotificationStatus = async (userId: string) => {
    try {
      console.log('🔍 Checking customer notification status for:', userId);
      
      // Check notification_settings table
      const { data: notificationSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Check profiles table as fallback
      const { data: profile } = await supabase
        .from('profiles')
        .select('fcm_token, notification_enabled, name, email')
        .eq('id', userId)
        .single();
      
      return {
        notificationSettings,
        profile,
        hasToken: !!(notificationSettings?.fcm_token || profile?.fcm_token),
        notificationsEnabled: notificationSettings?.notification_enabled ?? profile?.notification_enabled ?? false
      };
    } catch (error) {
      console.error('Error checking customer status:', error);
      throw error;
    }
  };

  const sendTestNotification = async () => {
    if (!testUserId.trim()) {
      toast.error('Please enter a customer user ID');
      return;
    }

    setIsLoading(true);
    try {
      // First check customer notification status
      const debugInfo = await checkCustomerNotificationStatus(testUserId);
      setDebugInfo(debugInfo);
      
      console.log('🔍 Customer debug info:', debugInfo);
      
      if (!debugInfo.hasToken) {
        toast.error('Customer has no FCM token - they need to enable notifications in their app');
        return;
      }
      
      if (!debugInfo.notificationsEnabled) {
        toast.error('Customer has notifications disabled');
        return;
      }
      
      // Send test notification
      const success = await ConsolidatedNotificationService.sendNotification(testUserId, {
        title: '🧪 Test Notification from Merchant',
        body: 'This is a test notification to verify the system is working correctly!',
        data: {
          type: 'test',
          merchantId: merchantId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (success) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Failed to send test notification - check console for details');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const sendBookingCompletionTest = async () => {
    if (!testUserId.trim()) {
      toast.error('Please enter a customer user ID');
      return;
    }

    setIsLoading(true);
    try {
      const success = await ConsolidatedNotificationService.sendNotification(testUserId, {
        title: '✨ Looking fabulous? We hope so!',
        body: `How was your experience at Test Salon? Share your thoughts and help others discover great service! 💫`,
        data: {
          type: 'booking_completed',
          bookingId: 'test-booking-123',
          merchantName: 'Test Salon',
          action: 'review'
        }
      });
      
      if (success) {
        toast.success('Booking completion notification sent successfully!');
      } else {
        toast.error('Failed to send booking completion notification');
      }
    } catch (error) {
      console.error('Error sending booking completion notification:', error);
      toast.error('Error sending notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Bell className="h-5 w-5" />
          Notification Debug Panel
          <Badge variant="outline" className="text-xs">Development</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="testUserId" className="text-sm font-medium">
            Customer User ID (for testing)
          </Label>
          <Input
            id="testUserId"
            placeholder="Enter customer user ID to test notifications..."
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-gray-600 mt-1">
            Get this from the booking card or customer profile
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={sendTestNotification} 
            disabled={isLoading || !testUserId.trim()}
            size="sm"
            variant="outline"
          >
            <Send className="h-4 w-4 mr-1" />
            Send Test
          </Button>
          
          <Button 
            onClick={sendBookingCompletionTest} 
            disabled={isLoading || !testUserId.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-1" />
            Test Review Request
          </Button>
        </div>
        
        {debugInfo && (
          <div className="mt-4 p-3 bg-white rounded border text-xs">
            <div className="font-medium mb-2 flex items-center gap-1">
              <User className="h-3 w-3" />
              Customer Debug Info:
            </div>
            <div className="space-y-1 text-gray-600">
              <div>Name: {debugInfo.profile?.name || 'N/A'}</div>
              <div>Email: {debugInfo.profile?.email || 'N/A'}</div>
              <div>Has FCM Token: {debugInfo.hasToken ? '✅' : '❌'}</div>
              <div>Notifications Enabled: {debugInfo.notificationsEnabled ? '✅' : '❌'}</div>
              {debugInfo.notificationSettings && (
                <div>Settings Table: ✅ Found</div>
              )}
              {debugInfo.profile && (
                <div>Profile Table: ✅ Found</div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <div className="font-medium">Debug Panel</div>
            <div>Use this to test notifications to customers. Remove from production.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationDebugPanel;
