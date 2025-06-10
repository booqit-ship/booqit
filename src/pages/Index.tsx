
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";
import { PermanentSession } from "@/utils/permanentSession";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();

  useEffect(() => {
    console.log(`📍 Index - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    // Check permanent session first for instant redirect
    const permanentData = PermanentSession.getSession();
    
    if (permanentData.isLoggedIn && permanentData.userRole) {
      console.log('⚡ Using permanent session for instant redirect:', permanentData.userRole);
      
      if (permanentData.userRole === "merchant") {
        console.log('🏪 Navigating to merchant dashboard (permanent)');
        navigate("/merchant", { replace: true });
        return;
      } else if (permanentData.userRole === "customer") {
        console.log('👤 Navigating to customer home (permanent)');
        navigate("/home", { replace: true });
        return;
      }
    }

    // Fallback to context auth state (only if loading is false)
    if (isAuthenticated && userRole && !loading) {
      console.log('✅ User authenticated via context, redirecting based on role:', userRole);
      
      if (userRole === "merchant") {
        console.log('🏪 Navigating to merchant dashboard');
        navigate("/merchant", { replace: true });
      } else if (userRole === "customer") {
        console.log('👤 Navigating to customer home');
        navigate("/home", { replace: true });
      }
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // Only show loading if we don't have permanent session AND auth is loading
  const permanentData = PermanentSession.getSession();
  if (loading && !permanentData.isLoggedIn) {
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
  if (!isAuthenticated && !PermanentSession.isLoggedIn()) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('🎯 Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // If authenticated but no clear role, default redirect
  if (isAuthenticated && !userRole) {
    console.log('⚠️ Authenticated but no role, defaulting to customer');
    navigate("/home", { replace: true });
    return null;
  }

  // Fallback - should not reach here
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
