
import React, { Suspense, lazy, ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/10 to-white">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-sm text-gray-600 font-poppins">Loading...</p>
    </div>
  </div>
);

// Higher-order component for lazy loading
const LazyRoute = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: any) => (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyRoute;
