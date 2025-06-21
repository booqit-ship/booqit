
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendConnected, setBackendConnected] = useState(true);

  useEffect(() => {
    // Monitor browser online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check backend connection periodically
    const checkBackend = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        const connected = !error;
        
        if (!connected && backendConnected) {
          toast.error('Backend connection lost');
        } else if (connected && !backendConnected) {
          toast.success('Backend connection restored');
        }
        
        setBackendConnected(connected);
      } catch (error) {
        if (backendConnected) {
          toast.error('Backend connection lost');
        }
        setBackendConnected(false);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    checkBackend(); // Initial check

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [backendConnected]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
        No internet connection
      </div>
    );
  }

  if (!backendConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50">
        Server connection issues - some features may not work
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
