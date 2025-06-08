
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, AlertCircle } from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { toast } from 'sonner';

const OneSignalTestButton: React.FC = () => {
  const { 
    requestPermission, 
    getSubscriptionDetails, 
    checkSubscriptionStatus,
    getCurrentUserId 
  } = useOneSignal();
  const [isLoading, setIsLoading] = useState(false);
  const [isForceLoading, setIsForceLoading] = useState(false);

  const handleTest = async () => {
    try {
      setIsLoading(true);
      console.log('🔔 Testing OneSignal...');
      
      // Check current status
      const details = await getSubscriptionDetails();
      const isSubscribed = await checkSubscriptionStatus();
      const userId = await getCurrentUserId();
      
      console.log('Current status:', { details, isSubscribed, userId });
      
      if (!isSubscribed) {
        toast.info('Requesting notification permission...', {
          duration: 5000,
        });
        
        const granted = await requestPermission();
        
        if (granted) {
          toast.success('✅ Permission granted! You should receive notifications now.');
          
          // Wait a moment then check status again
          setTimeout(async () => {
            const newDetails = await getSubscriptionDetails();
            const newStatus = await checkSubscriptionStatus();
            console.log('Updated status after permission:', { newDetails, newStatus });
          }, 2000);
        } else {
          toast.error('❌ Permission denied. Please check your browser settings and try again.');
        }
      } else {
        toast.success('✅ You are already subscribed to notifications!');
        
        // Show current user ID for verification
        if (userId) {
          toast.info(`User ID: ${userId}`, { duration: 5000 });
        }
      }
      
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Failed to test OneSignal: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSubscription = async () => {
    try {
      setIsForceLoading(true);
      console.log('🔔 Starting force subscription...');
      
      toast.info('Attempting comprehensive subscription setup...', {
        duration: 10000,
      });
      
      // Use the oneSignalService directly for force subscription
      const { oneSignalService } = await import('@/services/oneSignalService');
      const success = await oneSignalService.forceSubscription();
      
      if (success) {
        toast.success('✅ Successfully subscribed to notifications!');
        
        // Verify the subscription and user ID
        setTimeout(async () => {
          const details = await getSubscriptionDetails();
          const userId = await getCurrentUserId();
          console.log('Final subscription details:', details);
          console.log('Final user ID:', userId);
          
          if (details?.optedIn && userId) {
            toast.success('🎉 Subscription verified! You will receive booking notifications.', {
              duration: 8000
            });
            toast.info(`Registered with User ID: ${userId}`, { duration: 6000 });
          } else if (!userId) {
            toast.warning('⚠️ Subscribed but user ID not set. Please try "Reset User Setup".');
          }
        }, 2000);
      } else {
        toast.error('❌ Could not establish subscription. Please check browser settings.');
        toast.info('Try: 1) Allow notifications in browser settings 2) Refresh page 3) Try again', {
          duration: 12000,
        });
      }
      
    } catch (error) {
      console.error('Force subscription error:', error);
      toast.error('Failed to force subscription: ' + (error as Error).message);
    } finally {
      setIsForceLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleTest} 
        variant="outline" 
        size="sm"
        disabled={isLoading || isForceLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        Test OneSignal
      </Button>
      
      <Button 
        onClick={handleForceSubscription} 
        variant="default" 
        size="sm"
        disabled={isLoading || isForceLoading}
      >
        {isForceLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <AlertCircle className="h-4 w-4 mr-2" />
        )}
        Force Subscribe
      </Button>
    </div>
  );
};

export default OneSignalTestButton;
