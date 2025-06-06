
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

  // Validate session when component mounts
  useEffect(() => {
    if (!loading && isAuthenticated) {
      validateCurrentSession();
    }
  }, [loading, isAuthenticated]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-righteous text-booqit-dark mb-2">Loading BooqIt</h2>
          <p className="text-gray-600 font-poppins">Validating your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🚫 User not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    console.log('🚫 User role mismatch, redirecting based on role:', userRole);
    // Redirect to the appropriate dashboard based on role
    return <Navigate to={userRole === 'merchant' ? '/merchant' : '/'} replace />;
  }

  // If children are provided, render them (for wrapper usage)
  // If no children, render Outlet (for route element usage)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
