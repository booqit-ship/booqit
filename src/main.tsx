
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Create a client with enhanced caching but allow refetching for slot availability
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes for most data
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      retry: 1, // Retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: true, // Refetch when component mounts (important for slot availability)
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchInterval: false, // No automatic refetching
      networkMode: 'offlineFirst', // Use cache first, network second
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Global Service Worker registration for Firebase notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register Firebase messaging service worker first
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Firebase SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ Firebase SW registration failed: ', registrationError);
      });

    // Also register PWA service worker
    navigator.serviceWorker.register('/pwabuilder-sw.js')
      .then((registration) => {
        console.log('✅ PWA SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ PWA SW registration failed: ', registrationError);
      });
  });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('📱 Page became visible - refreshing slot availability');
    // Invalidate slot-related queries when page becomes visible
    queryClient.invalidateQueries({ queryKey: ['available-slots'] });
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
