
import React from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const OneSignalTestComponent: React.FC = () => {
  const { requestPermission, addTag } = useOneSignal();

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('✅ Push notifications enabled!');
      } else {
        toast.error('❌ Push notifications denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request permission');
    }
  };

  const handleTestNotification = async () => {
    try {
      // This would typically be called from a server
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test notification from BooqIt!' })
      });
      
      if (response.ok) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
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
          OneSignal Test
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
          onClick={handleTestNotification}
          className="w-full"
          variant="default"
        >
          <Check className="h-4 w-4 mr-2" />
          Send Test Notification
        </Button>
        
        <div className="text-sm text-muted-foreground text-center">
          <p>Use this to test OneSignal integration</p>
          <p className="text-xs mt-1">Check browser console for logs</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OneSignalTestComponent;
