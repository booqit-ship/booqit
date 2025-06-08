
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { toast } from 'sonner';

const OneSignalTestButton: React.FC = () => {
  const { requestPermission, getSubscriptionDetails } = useOneSignal();

  const handleTest = async () => {
    try {
      console.log('🔔 Testing OneSignal...');
      
      // Check current status
      const details = await getSubscriptionDetails();
      console.log('Current details:', details);
      
      if (!details?.optedIn) {
        toast.info('Requesting notification permission...');
        const granted = await requestPermission();
        
        if (granted) {
          toast.success('✅ Permission granted! You should receive notifications now.');
        } else {
          toast.error('❌ Permission denied. Please allow notifications in your browser.');
        }
      } else {
        toast.success('✅ You are already subscribed to notifications!');
      }
      
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Failed to test OneSignal');
    }
  };

  return (
    <Button onClick={handleTest} variant="outline" size="sm">
      <Bell className="h-4 w-4 mr-2" />
      Test OneSignal
    </Button>
  );
};

export default OneSignalTestButton;
