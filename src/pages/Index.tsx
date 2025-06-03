
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    console.log('Index: Auth state changed', { isAuthenticated, userRole });
    
    if (isAuthenticated && userRole) {
      if (userRole === "merchant") {
        navigate("/merchant", { replace: true });
      } else if (userRole === "customer") {
        // Stay on the home page for customers
        console.log('Customer authenticated, staying on home page');
      }
    } else if (!isAuthenticated) {
      // Show role selection for unauthenticated users
      setShowRoleSelection(true);
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    // Navigate to auth page with selected role
    navigate("/auth", { state: { selectedRole: role } });
  };

  // Show role selection for unauthenticated users
  if (!isAuthenticated && showRoleSelection) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // Show loading for authenticated users while navigation resolves
  if (isAuthenticated && userRole === "merchant") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Redirecting to Dashboard</h1>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // For authenticated customers, this component will be replaced by CustomerLayout
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Loading BooqIt</h1>
        <p className="text-gray-500">Please wait...</p>
      </div>
    </div>
  );
};

export default Index;
