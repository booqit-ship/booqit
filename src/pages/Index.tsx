
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Don't do anything while loading or if already navigated
    if (loading || hasNavigated) return;

    if (isAuthenticated && userRole) {
      setHasNavigated(true);
      if (userRole === "merchant") {
        navigate("/merchant", { replace: true });
      } else {
        // For customers, show the homepage content instead of redirecting
        setShowRoleSelection(false);
      }
    } else if (!isAuthenticated && !loading) {
      // Show role selection for unauthenticated users
      setShowRoleSelection(true);
    }
  }, [isAuthenticated, userRole, loading, navigate, hasNavigated]);

  const handleRoleSelect = (role: UserRole) => {
    // Navigate to auth page with selected role
    navigate("/auth", { state: { selectedRole: role } });
  };

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
  if (showRoleSelection && !isAuthenticated) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // For authenticated customers, this will be handled by the routing in App.tsx
  return null;
};

export default Index;
