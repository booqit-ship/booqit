
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
  const isNavigating = useRef(false);

  // Reset navigation tracking when auth state changes
  useEffect(() => {
    hasNavigated.current = false;
    isNavigating.current = false;
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    // Don't do anything while loading or if already navigated/navigating
    if (loading || hasNavigated.current || isNavigating.current) {
      return;
    }

    const handleNavigation = () => {
      console.log(`Index - navigation check:`, { 
        isAuthenticated, 
        userRole, 
        loading,
        hasNavigated: hasNavigated.current
      });
      
      if (isAuthenticated && userRole && !hasNavigated.current && !isNavigating.current) {
        hasNavigated.current = true;
        isNavigating.current = true;
        
        if (userRole === "merchant") {
          console.log('Navigating to merchant dashboard');
          navigate("/merchant", { replace: true });
        } else {
          console.log('Customer authenticated, staying on index');
          setShowRoleSelection(false);
        }
      } else if (!isAuthenticated && !loading && !hasNavigated.current) {
        console.log('User not authenticated, showing role selection');
        setShowRoleSelection(true);
      }
    };

    // Only delay navigation on initial load
    const timeoutId = setTimeout(handleNavigation, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, userRole, loading, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    if (!hasNavigated.current && !isNavigating.current) {
      hasNavigated.current = true;
      isNavigating.current = true;
      console.log('Role selected:', role);
      navigate("/auth", { state: { selectedRole: role }, replace: true });
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

  // Fallback for edge cases - prevent white screen
  if (!loading && !isAuthenticated && !showRoleSelection) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  // For authenticated customers, this will be handled by the routing in App.tsx
  return null;
};

export default Index;
