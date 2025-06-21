
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";
import { PermanentSession } from "@/utils/permanentSession";
import { InstantSessionLoader } from "@/utils/instantSessionLoader";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();

  useEffect(() => {
    console.log(`📍 INSTANT INDEX - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    // Use instant session for immediate redirect
    const instantSession = InstantSessionLoader.getPreloadedSession();
    const permanentData = PermanentSession.getSession();
    
    // Check instant session first
    if (instantSession?.isAuthenticated && instantSession.userRole) {
      console.log('⚡ INSTANT: Using instant session for immediate redirect:', instantSession.userRole);
      
      if (instantSession.userRole === "merchant") {
        console.log('🏪 INSTANT: Navigating to merchant dashboard (instant)');
        navigate("/merchant", { replace: true });
        return;
      } else if (instantSession.userRole === "customer") {
        console.log('👤 INSTANT: Navigating to customer home (instant)');
        navigate("/home", { replace: true });
        return;
      }
    }
    
    // Check permanent session second
    if (permanentData.isLoggedIn && permanentData.userRole) {
      console.log('⚡ INSTANT: Using permanent session for immediate redirect:', permanentData.userRole);
      
      if (permanentData.userRole === "merchant") {
        console.log('🏪 INSTANT: Navigating to merchant dashboard (permanent)');
        navigate("/merchant", { replace: true });
        return;
      } else if (permanentData.userRole === "customer") {
        console.log('👤 INSTANT: Navigating to customer home (permanent)');
        navigate("/home", { replace: true });
        return;
      }
    }

    // Fallback to context auth state (only if loading is false)
    if (isAuthenticated && userRole && !loading) {
      console.log('✅ INSTANT: User authenticated via context, redirecting based on role:', userRole);
      
      if (userRole === "merchant") {
        console.log('🏪 INSTANT: Navigating to merchant dashboard');
        navigate("/merchant", { replace: true });
      } else if (userRole === "customer") {
        console.log('👤 INSTANT: Navigating to customer home');
        navigate("/home", { replace: true });
      }
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // NEVER show loading if we have any cached session data
  const hasAnyCachedSession = InstantSessionLoader.hasInstantSession() || PermanentSession.isLoggedIn();
  
  if (loading && !hasAnyCachedSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-righteous mb-2">BooqIt</h1>
          <div className="w-6 h-6 border-2 border-booqit-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show role selection immediately for unauthenticated users - NO LOADING STATE
  if (!isAuthenticated && !hasAnyCachedSession) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('🎯 INSTANT: Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // If authenticated but no clear role, default redirect
  if ((isAuthenticated || hasAnyCachedSession) && !userRole) {
    console.log('⚠️ INSTANT: Authenticated but no role, defaulting to customer');
    navigate("/home", { replace: true });
    return null;
  }

  // Fallback - should not reach here with instant loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
      <div className="text-center">
        <h1 className="text-2xl font-righteous mb-2">Welcome to BooqIt</h1>
        <p className="text-gray-500 font-poppins">Redirecting...</p>
      </div>
    </div>
  );
};

export default Index;
