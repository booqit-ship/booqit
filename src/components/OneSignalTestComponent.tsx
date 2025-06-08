
import React, { useState } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, X, TestTube, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

const OneSignalTestComponent: React.FC = () => {
  const { requestPermission, showPermissionPrompt, showNativePrompt, forcePermissionPrompt } = useOneSignal();
  const { userId } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissionStatus = async () => {
    try {
      if (!Capacitor.isNativePlatform() && window.OneSignal) {
        const permission = await window.OneSignal.Notifications.permission;
        setPermissionStatus(permission);
        toast.info(`Current permission status: ${permission}`);
      } else {
        toast.info('Native platform - permissions handled automatically');
        setPermissionStatus('native');
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      toast.error('Failed to check permission status');
    }
  };

  const handleRequestPermission = async () => {
    try {
      setIsLoading(true);
      const granted = await requestPermission();
      if (granted) {
        toast.success('✅ Push notifications enabled!');
        setPermissionStatus('granted');
      } else {
        toast.error('❌ Push notifications denied');
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcePermissionPrompt = async () => {
    try {
      setIsLoading(true);
      await forcePermissionPrompt();
      toast.info('Permission prompt shown');
    } catch (error) {
      console.error('Error showing force prompt:', error);
      toast.error('Failed to show permission prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSlidedownPrompt = async () => {
    try {
      await showPermissionPrompt();
      toast.info('Slidedown permission prompt shown');
    } catch (error) {
      console.error('Error showing slidedown prompt:', error);
      toast.error('Failed to show slidedown prompt');
    }
  };

  const handleShowNativePrompt = async () => {
    try {
      await showNativePrompt();
      toast.info('Native permission prompt shown');
    } catch (error) {
      console.error('Error showing native prompt:', error);
      toast.error('Failed to show native prompt');
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            toast.success('✅ Location permission granted!');
            console.log('Location:', position.coords);
          },
          (error) => {
            toast.error('❌ Location permission denied');
            console.error('Location error:', error);
          }
        );
      } else {
        toast.error('Geolocation not supported');
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      toast.error('Failed to request location permission');
    }
  };

  const handleTestBookingNotification = async () => {
    try {
      setIsLoading(true);
      
      if (!userId) {
        toast.error('You must be logged in to test notifications');
        return;
      }

      console.log('Testing notification for user:', userId);

      const { data, error } = await supabase.functions.invoke('send-booking-notification', {
        body: {
          bookingId: 'test-' + Date.now(),
          merchantUserId: userId,
          customerName: 'John Doe',
          serviceName: 'Premium Haircut',
          dateTime: 'Today at ' + new Date().toLocaleTimeString(),
          staffName: 'Sarah Wilson',
          automated: false
        }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast.error('Failed to send test notification: ' + error.message);
      } else {
        console.log('Test notification response:', data);
        toast.success('✅ Test notification sent! Check your device.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      case 'default': return 'text-yellow-600';
      case 'native': return 'text-blue-600';
      default: return 'text-gray-600';
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
      <CardContent className="space-y-3">
        <Button 
          onClick={checkPermissionStatus}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <Check className="h-4 w-4 mr-2" />
          Check Permission Status
        </Button>
        
        <Button 
          onClick={handleRequestPermission}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <Bell className="h-4 w-4 mr-2" />
          Request Push Permission
        </Button>

        <Button 
          onClick={handleForcePermissionPrompt}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Force Permission Prompt
        </Button>
        
        <Button 
          onClick={handleShowSlidedownPrompt}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Show Slidedown Prompt
        </Button>

        <Button 
          onClick={handleShowNativePrompt}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <Bell className="h-4 w-4 mr-2" />
          Show Native Prompt
        </Button>
        
        <Button 
          onClick={requestLocationPermission}
          className="w-full"
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Request Location Permission
        </Button>
        
        <Button 
          onClick={handleTestBookingNotification}
          className="w-full"
          variant="default"
          size="sm"
          disabled={isLoading || !userId}
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isLoading ? 'Sending...' : 'Test Booking Notification'}
        </Button>
        
        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>Permission Status: <span className={`font-mono text-xs px-1 rounded ${getPermissionStatusColor()}`}>{permissionStatus}</span></p>
          <p>Platform: {Capacitor.isNativePlatform() ? 'Native' : 'Web'}</p>
          <p className="text-xs">Must be logged in as merchant for notifications</p>
          {!userId && <p className="text-xs text-red-500">⚠️ Please log in to test notifications</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default OneSignalTestComponent;
