
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { PermanentSession } from '@/utils/permanentSession';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  // Check permanent session for instant auth check
  const permanentData = PermanentSession.getSession();
  const hasPermanentSession = permanentData.isLoggedIn;
  const permanentRole = permanentData.userRole as UserRole;

  // Show minimal loading only if we're truly checking (should be very brief)
  if (loading && !hasPermanentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  // Use permanent session for instant redirect if available
  const effectiveAuth = isAuthenticated || hasPermanentSession;
  const effectiveRole = userRole || permanentRole;

  if (!effectiveAuth) {
    console.log('🚫 User not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requiredRole && effectiveRole !== requiredRole) {
    console.log('🚫 User role mismatch, redirecting based on role:', effectiveRole);
    // Redirect to the appropriate dashboard based on role
    return <Navigate to={effectiveRole === 'merchant' ? '/merchant' : '/'} replace />;
  }

  // If children are provided, render them (for wrapper usage)
  // If no children, render Outlet (for route element usage)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
