
import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface LazyRouteProps {
  children: React.ReactNode;
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/10 to-white">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-sm text-gray-600 font-poppins">Loading...</p>
    </div>
  </div>
);

const LazyRoute: React.FC<LazyRouteProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyRoute;
