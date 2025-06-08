
import React from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, X, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const OneSignalTestComponent: React.FC = () => {
  const { requestPermission, showPermissionPrompt } = useOneSignal();
  const { userId } = useAuth();

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('✅ Push notifications enabled!');
      } else {
        toast.error('❌ Push notifications denied');
        // Show the slidedown prompt as a fallback
        await showPermissionPrompt();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request permission');
    }
  };

  const handleShowPrompt = async () => {
    try {
      await showPermissionPrompt();
      toast.info('Permission prompt shown');
    } catch (error) {
      console.error('Error showing prompt:', error);
      toast.error('Failed to show permission prompt');
    }
  };

  const handleTestBookingNotification = async () => {
    try {
      if (!userId) {
        toast.error('You must be logged in to test notifications');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-booking-notification', {
        body: {
          bookingId: 'test-' + Date.now(),
          merchantUserId: userId,
          customerName: 'Test Customer',
          serviceName: 'Test Service',
          dateTime: 'Today at ' + new Date().toLocaleTimeString(),
          automated: false
        }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast.error('Failed to send test notification: ' + error.message);
      } else {
        console.log('Test notification response:', data);
        toast.success('Test notification sent! Check your device.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Bell className="h-5 w-5" />
          OneSignal Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleRequestPermission}
          className="w-full"
          variant="outline"
        >
          <Bell className="h-4 w-4 mr-2" />
          Request Push Permission
        </Button>
        
        <Button 
          onClick={handleShowPrompt}
          className="w-full"
          variant="outline"
        >
          <X className="h-4 w-4 mr-2" />
          Show Permission Prompt
        </Button>
        
        <Button 
          onClick={handleTestBookingNotification}
          className="w-full"
          variant="default"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Booking Notification
        </Button>
        
        <div className="text-sm text-muted-foreground text-center">
          <p>Use this panel to test OneSignal integration</p>
          <p className="text-xs mt-1">Check browser console for detailed logs</p>
          <p className="text-xs mt-1">Must be logged in as merchant for full testing</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OneSignalTestComponent;
