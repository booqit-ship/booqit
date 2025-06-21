
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Reduced default stale time to 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      retry: 2, // Reduced retries for faster failure detection
      refetchOnWindowFocus: true, // Enable refetch on window focus globally
      refetchOnMount: true, // Always refetch on mount
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
