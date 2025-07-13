
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationStackProvider } from './contexts/NavigationStackContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import AppContent from './components/AppContent';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationStackProvider>
          <BrowserRouter>
            <AppContent />
            <Toaster />
          </BrowserRouter>
        </NavigationStackProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
