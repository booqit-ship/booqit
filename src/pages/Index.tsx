
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, loading } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);

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
      } else {
        console.log('Customer authenticated, staying on index for customer features');
        setShowRoleSelection(false);
      }
    } else if (!isAuthenticated) {
      console.log('User not authenticated, showing role selection');
      setShowRoleSelection(true);
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
  if (!isAuthenticated && showRoleSelection) {
    const handleRoleSelect = (role: UserRole) => {
      console.log('Role selected:', role);
      const selectedRole = location.state?.selectedRole || role;
      navigate("/auth", { state: { selectedRole }, replace: true });
    };

    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // For authenticated customers, this will be handled by the routing in App.tsx
  return null;
};

export default Index;
