
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeviceToken {
  fcm_token: string;
  device_type: string;
  device_name: string;
  last_used_at: string;
}

const MultiDeviceNotificationPanel = () => {
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchDeviceTokens();
    }
  }, [user?.id]);

  const fetchDeviceTokens = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, last_used_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setDeviceTokens(data || []);
    } catch (error) {
      console.error('Error fetching device tokens:', error);
    }
  };

  const removeDevice = async (fcmToken: string) => {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('fcm_token', fcmToken);

      if (error) throw error;
      
      toast.success('Device removed successfully');
      fetchDeviceTokens();
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    }
  };

  const registerCurrentDevice = async () => {
    setIsLoading(true);
    try {
      // This would trigger the simple notification registration
      toast.info('Please allow notifications when prompted');
    } catch (error) {
      console.error('Error registering device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      case 'web':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Tablet className="h-4 w-4" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'android':
        return 'Android';
      case 'ios':
        return 'iOS';
      case 'web':
        return 'Web Browser';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Connected Devices
        </CardTitle>
        <CardDescription>
          Manage devices that can receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Register current device button */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Current Device</p>
            <p className="text-xs text-muted-foreground">
              Register this device to receive notifications
            </p>
          </div>
          <Button
            onClick={registerCurrentDevice}
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {isLoading ? 'Registering...' : 'Register Device'}
          </Button>
        </div>

        {/* Device list */}
        {deviceTokens.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Registered Devices ({deviceTokens.length})</p>
            {deviceTokens.map((device, index) => (
              <div
                key={device.fcm_token}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device.device_type)}
                  <div>
                    <p className="text-sm font-medium">
                      {device.device_name || getDeviceTypeLabel(device.device_type)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getDeviceTypeLabel(device.device_type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last used: {format(new Date(device.last_used_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeDevice(device.fcm_token)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No devices registered yet
            </p>
            <p className="text-xs text-muted-foreground">
              Register your devices to receive notifications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiDeviceNotificationPanel;
