
import { useEffect } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';

export const OneSignalInitializer = () => {
  const oneSignal = useOneSignal();
  
  useEffect(() => {
    console.log('🔔 OneSignal initialized in app');
  }, []);

  return null; // This component doesn't render anything
};
