
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";
import { validateCurrentSession } from "@/utils/sessionRecovery";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();

  useEffect(() => {
    // Don't do anything while loading
    if (loading) {
      console.log('🔄 Index - Auth still loading, waiting...');
      return;
    }

    console.log(`📍 Index - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    // Only redirect authenticated users after loading is complete
    if (isAuthenticated && userRole) {
      console.log('✅ User authenticated, redirecting based on role:', userRole);
      
      // Use setTimeout to ensure auth context is fully updated
      setTimeout(() => {
        if (userRole === "merchant") {
          console.log('🏪 Navigating to merchant dashboard');
          navigate("/merchant", { replace: true });
        } else if (userRole === "customer") {
          console.log('👤 Navigating to customer home');
          navigate("/home", { replace: true });
        }
      }, 0);
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // Validate session periodically when user is on the index page
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const intervalId = setInterval(validateCurrentSession, 60000); // Check every minute
      return () => clearInterval(intervalId);
    }
  }, [loading, isAuthenticated]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-righteous mb-2">Loading BooqIt</h1>
          <p className="text-gray-500 font-poppins">Initializing app...</p>
        </div>
      </div>
    );
  }

  // Show role selection for unauthenticated users (only after loading is complete)
  if (!isAuthenticated) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('🎯 Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // Fallback for authenticated users while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
      <div className="text-center">
        <h1 className="text-2xl font-righteous mb-2">Welcome to BooqIt</h1>
        <p className="text-gray-500 font-poppins">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default Index;
