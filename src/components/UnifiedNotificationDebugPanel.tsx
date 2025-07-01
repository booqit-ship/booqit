
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedNotifications } from '@/hooks/useUnifiedNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { Loader2, Bell, Smartphone, Globe } from 'lucide-react';

const UnifiedNotificationDebugPanel: React.FC = () => {
  const { user } = useAuth();
  const { isRegistered, isLoading, error, registerForNotifications, sendTestNotification } = useUnifiedNotifications();
  const [testLoading, setTestLoading] = useState(false);

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const handleTestNotification = async () => {
    setTestLoading(true);
    try {
      await sendTestNotification();
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isNative ? <Smartphone className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          Unified Notifications Debug
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">
            {platform}
          </Badge>
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Platform:</span>
            <p className="text-muted-foreground">{isNative ? 'Native' : 'Web'}</p>
          </div>
          <div>
            <span className="font-medium">User ID:</span>
            <p className="text-muted-foreground text-xs">{user?.id?.substring(0, 8)}...</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={registerForNotifications}
            disabled={isLoading || isRegistered}
            className="w-full"
            variant={isRegistered ? "outline" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRegistered ? "Already Registered" : "Register for Notifications"}
          </Button>

          <Button
            onClick={handleTestNotification}
            disabled={!isRegistered || testLoading}
            variant="outline"
            className="w-full"
          >
            {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Bell className="mr-2 h-4 w-4" />
            Send Test Notification
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Platform: {platform}</p>
          <p>• Native: {isNative ? 'Yes' : 'No'}</p>
          <p>• Status: {isRegistered ? '✅ Ready' : '⏳ Pending'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedNotificationDebugPanel;
