
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();

  useEffect(() => {
    // Don't do anything while loading
    if (loading) {
      return;
    }

    console.log(`Index - Auth state:`, { 
      isAuthenticated, 
      userRole, 
      loading 
    });

    if (isAuthenticated && userRole) {
      if (userRole === "merchant") {
        console.log('Navigating to merchant dashboard');
        navigate("/merchant", { replace: true });
      }
      // For customers, stay on index page (will be handled by routes)
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-righteous mb-2">Loading BooqIt</h1>
          <p className="text-gray-500 font-poppins">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show role selection for unauthenticated users
  if (!isAuthenticated) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // For authenticated users, this will be handled by the routing in App.tsx
  return null;
};

export default Index;
