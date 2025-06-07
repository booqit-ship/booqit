
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create a client with aggressive caching to prevent refetching on tab switches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh longer
      gcTime: 60 * 60 * 1000, // 1 hour - keep in cache much longer
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // CRITICAL: Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch when component mounts if data exists
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchInterval: false, // No automatic refetching
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

// Handle page visibility changes - clear any pending session recovery attempts
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('📱 Page became visible - session should be instantly available');
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
