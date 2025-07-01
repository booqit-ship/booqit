
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const OfflineBanner: React.FC = () => {
  const { isOnline, isNative } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        {isNative 
          ? "You're offline. Some features may not work until you reconnect."
          : "No internet connection. Please check your network and try again."
        }
      </AlertDescription>
    </Alert>
  );
};

export default OfflineBanner;
