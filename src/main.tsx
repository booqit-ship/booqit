
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create a client with better cache management for long sessions
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - data becomes stale after this
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for this long
      retry: (failureCount, error: any) => {
        // Retry logic for network errors but not for auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      refetchOnMount: true, // Refetch when component mounts
      refetchOnReconnect: true, // Refetch on network reconnect
      refetchInterval: false, // No automatic interval refetching by default
      networkMode: 'online', // Only make requests when online
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      networkMode: 'online',
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Enhanced service worker registration for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pwabuilder-sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });
}

// Handle page visibility changes - refetch critical data when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('📱 Page became visible - refetching critical data');
    // Refetch queries that are currently being observed
    queryClient.refetchQueries({ 
      type: 'active',
      stale: true 
    });
  }
});

// Handle online/offline status
window.addEventListener('online', () => {
  console.log('🌐 Network reconnected - refetching stale data');
  queryClient.refetchQueries({ stale: true });
});

window.addEventListener('offline', () => {
  console.log('📴 Network disconnected - using cached data only');
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
