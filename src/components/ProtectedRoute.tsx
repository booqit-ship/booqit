
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { validateCurrentSession } from '@/utils/sessionRecovery';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  // Validate session when component mounts and periodically
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Validate session immediately
      validateCurrentSession();
      
      // Set up periodic validation every 5 minutes
      const intervalId = setInterval(validateCurrentSession, 300000);
      return () => clearInterval(intervalId);
    }
  }, [loading, isAuthenticated]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    console.log('User role mismatch, redirecting based on role:', userRole);
    // Redirect to the appropriate dashboard based on role
    return <Navigate to={userRole === 'merchant' ? '/merchant' : '/'} replace />;
  }

  // If children are provided, render them (for wrapper usage)
  // If no children, render Outlet (for route element usage)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
