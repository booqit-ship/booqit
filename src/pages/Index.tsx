
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
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing navigation timeout
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }

    // Don't do anything while loading or if already navigated
    if (loading || hasNavigated.current) return;

    const handleNavigation = () => {
      console.log('Index - handling navigation:', { isAuthenticated, userRole, loading });
      
      if (isAuthenticated && userRole && !hasNavigated.current) {
        hasNavigated.current = true;
        
        if (userRole === "merchant") {
          console.log('Navigating to merchant dashboard');
          navigate("/merchant", { replace: true });
        } else {
          console.log('Customer authenticated, staying on index');
          // For customers, stay on this page and let routing handle it
          setShowRoleSelection(false);
        }
      } else if (!isAuthenticated && !loading) {
        console.log('User not authenticated, showing role selection');
        setShowRoleSelection(true);
      }
    };

    // Small delay to ensure auth state is settled
    navigationTimeout.current = setTimeout(handleNavigation, 100);
    
    return () => {
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
    };
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
