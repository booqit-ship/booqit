
import React, { useState, useEffect } from 'react';
import { BackendHealthCheck, HealthCheckResult } from '@/utils/backendHealthCheck';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

const ConnectionMonitor: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      const status = await BackendHealthCheck.checkHealth();
      setHealthStatus(status);
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!healthStatus || healthStatus.isHealthy) {
    return null; // Don't show when healthy
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            Connection Issue - Some features may not work properly
          </span>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm underline hover:no-underline"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-2 text-xs bg-red-600 p-2 rounded">
          <p>Error: {healthStatus.error}</p>
          {healthStatus.latency && (
            <p>Response time: {healthStatus.latency}ms</p>
          )}
          <p>Token status: {healthStatus.tokenValid ? 'Valid' : 'Invalid'}</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionMonitor;
