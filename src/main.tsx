
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create a client with ULTRA aggressive caching to prevent ANY refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Data never becomes stale
      gcTime: Infinity, // Keep in cache forever
      retry: 0, // Never retry failed requests
      refetchOnWindowFocus: false, // NEVER refetch when tab regains focus
      refetchOnMount: false, // NEVER refetch when component mounts
      refetchOnReconnect: false, // NEVER refetch on reconnect
      refetchInterval: false, // NO automatic refetching ever
      networkMode: 'offlineFirst', // Use cache first, network second
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

// Handle page visibility changes - NO session recovery attempts
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('📱 Page became visible - using cached session only');
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
