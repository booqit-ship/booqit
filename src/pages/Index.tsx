
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();

  useEffect(() => {
    console.log(`📍 Index - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    // Immediate redirect for authenticated users - don't wait for loading
    if (isAuthenticated && userRole) {
      console.log('✅ User authenticated, redirecting based on role:', userRole);
      
      if (userRole === "merchant") {
        console.log('🏪 Navigating to merchant dashboard');
        navigate("/merchant", { replace: true });
      } else if (userRole === "customer") {
        console.log('👤 Navigating to customer home');
        navigate("/home", { replace: true });
      }
    }
  }, [isAuthenticated, userRole, navigate]);

  // Only show minimal loading for very brief initial auth check
  if (loading) {
    // Show a very brief, minimal loading - this should be almost instant
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-righteous mb-2">BooqIt</h1>
          <div className="w-6 h-6 border-2 border-booqit-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show role selection for unauthenticated users
  if (!isAuthenticated) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('🎯 Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // Fallback for authenticated users while redirect happens (should be instant)
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
