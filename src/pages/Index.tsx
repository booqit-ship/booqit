
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";
import { PermanentSession } from "@/utils/permanentSession";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    console.log(`📍 Index - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // Don't redirect while still loading unless we have permanent session data
    if (loading) {
      const permanentData = PermanentSession.getSession();
      if (!permanentData.isLoggedIn) {
        console.log('⏳ Still loading auth, waiting...');
        return;
      }
      
      // We have permanent session data, proceed with redirect
      console.log('⚡ Using permanent session while auth loads');
      hasRedirected.current = true;
      
      if (permanentData.userRole === "merchant") {
        navigate("/merchant", { replace: true });
        return;
      } else if (permanentData.userRole === "customer") {
        navigate("/home", { replace: true });
        return;
      }
    }

    // Normal auth-based redirect when not loading
    if (isAuthenticated && userRole && !loading) {
      console.log('✅ User authenticated, redirecting based on role:', userRole);
      hasRedirected.current = true;
      
      if (userRole === "merchant") {
        console.log('🏪 Navigating to merchant dashboard');
        navigate("/merchant", { replace: true });
      } else if (userRole === "customer") {
        console.log('👤 Navigating to customer home');
        navigate("/home", { replace: true });
      }
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // Show loading only when necessary
  if (loading && !PermanentSession.isLoggedIn()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-righteous mb-2">BooqIt</h1>
          <div className="w-6 h-6 border-2 border-booqit-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Show role selection for unauthenticated users
  if (!isAuthenticated && !loading) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('🎯 Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
      <div className="text-center">
        <h1 className="text-2xl font-righteous mb-2">Welcome to BooqIt</h1>
        <p className="text-gray-500 font-poppins">Setting up your experience...</p>
      </div>
    </div>
  );
};

export default Index;
