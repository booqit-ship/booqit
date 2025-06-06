
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    console.log('[Index] Auth state:', { isAuthenticated, userRole, loading });
    
    if (!loading) {
      if (isAuthenticated) {
        if (userRole === "merchant") {
          console.log('[Index] Redirecting to merchant dashboard');
          navigate("/merchant");
        } else if (userRole === "customer") {
          console.log('[Index] User is authenticated customer, staying on home');
          // Customer stays on home page (/)
        }
      } else {
        console.log('[Index] User not authenticated, showing role selection');
        setShowRoleSelection(true);
      }
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    console.log('[Index] Role selected:', role);
    // Navigate to auth page with selected role
    navigate("/auth", { state: { selectedRole: role } });
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-righteous mb-2">Loading BooqIt</h1>
          <p className="text-gray-500 font-poppins">Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (showRoleSelection) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // If authenticated customer, show home content
  if (isAuthenticated && userRole === "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <h1 className="text-3xl font-righteous mb-4 text-booqit-primary">Welcome to BooqIt!</h1>
          <p className="text-gray-600 font-poppins">You're successfully logged in.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
