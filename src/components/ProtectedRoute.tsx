
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', { 
    isAuthenticated, 
    userRole, 
    loading, 
    requiredRole,
    path: location.pathname 
  });

  // Check permanent session for instant auth check
  const permanentData = PermanentSession.getSession();
  const hasPermanentSession = permanentData.isLoggedIn;
  const permanentRole = permanentData.userRole as UserRole;

  // Show loading with shorter duration - if we have permanent session, proceed quickly
  if (loading && !hasPermanentSession) {
    console.log('⏳ ProtectedRoute: Showing loading (no permanent session)');
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

  console.log('🔍 ProtectedRoute effective state:', { 
    effectiveAuth, 
    effectiveRole, 
    isAuthenticated, 
    hasPermanentSession,
    permanentRole,
    actualRole: userRole
  });

  if (!effectiveAuth) {
    console.log('🚫 ProtectedRoute: User not authenticated, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Special handling for merchant onboarding - allow all authenticated users
  const isOnboardingPage = location.pathname === '/merchant/onboarding';
  
  if (isOnboardingPage) {
    console.log('✅ ProtectedRoute: Allowing access to onboarding for authenticated user');
    return children ? <>{children}</> : <Outlet />;
  }
  
  // Only redirect on role mismatch if we have a specific required role AND a definitive role
  if (requiredRole && effectiveRole && effectiveRole !== requiredRole) {
    console.log('🚫 ProtectedRoute: Role mismatch, redirecting based on role:', effectiveRole);
    const redirectPath = effectiveRole === 'merchant' ? '/merchant' : '/home';
    return <Navigate to={redirectPath} replace />;
  }

  // If we have a required role but no effective role, wait a bit longer for role to load
  if (requiredRole && !effectiveRole && loading) {
    console.log('⏳ ProtectedRoute: Waiting for role to load...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Verifying access...</p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
