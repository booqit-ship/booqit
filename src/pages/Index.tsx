
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelection from "@/components/RoleSelection";
import { UserRole } from "@/types";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, loading } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Prevent multiple navigations and memory leaks
    if (loading || hasNavigated.current) return;

    const handleNavigation = () => {
      if (isAuthenticated && userRole && !hasNavigated.current) {
        hasNavigated.current = true;
        
        if (userRole === "merchant") {
          navigate("/merchant", { replace: true });
        } else {
          // For customers, stay on this page and let routing handle it
          setShowRoleSelection(false);
        }
      } else if (!isAuthenticated && !loading) {
        setShowRoleSelection(true);
      }
    };

    // Use timeout to prevent blocking
    const timeoutId = setTimeout(handleNavigation, 0);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, userRole, loading, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      navigate("/auth", { state: { selectedRole: role } });
    }
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
