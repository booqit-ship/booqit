
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { PermanentSession } from '@/utils/permanentSession';
import { InstantSessionLoader } from '@/utils/instantSessionLoader';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  // Get instant session data for immediate decisions
  const permanentData = PermanentSession.getSession();
  const instantSession = InstantSessionLoader.getPreloadedSession();
  
  const hasPermanentSession = permanentData.isLoggedIn;
  const permanentRole = permanentData.userRole as UserRole;

  // Use instant session for immediate auth check
  const hasInstantAuth = instantSession?.isAuthenticated || false;
  const instantRole = instantSession?.userRole as UserRole;

  // NEVER show loading if we have any cached session data
  if (loading && !hasPermanentSession && !hasInstantAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  // Use multiple fallbacks for bulletproof auth detection
  const effectiveAuth = isAuthenticated || hasPermanentSession || hasInstantAuth;
  const effectiveRole = userRole || permanentRole || instantRole;

  console.log('🛡️ INSTANT PROTECTED ROUTE:', {
    path: window.location.pathname,
    effectiveAuth,
    effectiveRole,
    requiredRole,
    sources: {
      context: { isAuthenticated, userRole },
      permanent: { hasPermanentSession, permanentRole },
      instant: { hasInstantAuth, instantRole }
    }
  });

  if (!effectiveAuth) {
    console.log('🚫 INSTANT: User not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requiredRole && effectiveRole !== requiredRole) {
    console.log('🚫 INSTANT: User role mismatch, redirecting based on role:', effectiveRole);
    return <Navigate to={effectiveRole === 'merchant' ? '/merchant' : '/'} replace />;
  }

  // Render immediately - no delays
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
