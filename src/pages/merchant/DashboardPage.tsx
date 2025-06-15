import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import BookingStats from '@/components/merchant/calendar/BookingStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, userRole } = useAuth();
  const { 
    isInitialized, 
    hasPermission, 
    isSupported, 
    requestPermissionManually,
    initializationError 
  } = useNotifications();

  // Auto-initialize notifications when merchant logs in
  useEffect(() => {
    if (userRole === 'merchant' && hasPermission && !isInitialized) {
      console.log('🔔 MERCHANT: Auto-initializing notifications on dashboard load');
    }
  }, [userRole, hasPermission, isInitialized]);

  const handleEnableNotifications = async () => {
    console.log('🔔 MERCHANT: Manually enabling notifications');
    const success = await requestPermissionManually();
    if (success) {
      toast.success('Notifications enabled! You\'ll now receive booking alerts.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Status Card */}
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
                <span className="text-orange-600">Enable Booking Notifications</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialized ? (
            <p className="text-sm text-gray-600">
              ✅ You'll receive instant notifications when customers book appointments.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                📱 Enable notifications to get instant alerts when customers book with you.
              </p>
              {!isSupported && (
                <p className="text-sm text-red-600">
                  ❌ Your browser doesn't support notifications.
                </p>
              )}
              {initializationError && (
                <p className="text-sm text-red-600">
                  ⚠️ Issue: {initializationError}
                </p>
              )}
              {isSupported && (
                <Button 
                  onClick={handleEnableNotifications}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing dashboard content */}
      <BookingStats 
        total={0}
        pending={0}
        confirmed={0}
        completed={0}
        todaysEarning={0}
      />
    </div>
  );
}
