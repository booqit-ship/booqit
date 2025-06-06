
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
  const navigationAttempts = useRef(0);
  const maxNavigationAttempts = 3;

  useEffect(() => {
    // Reset navigation tracking when auth state changes
    hasNavigated.current = false;
    navigationAttempts.current = 0;
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    // Don't do anything while loading or if already navigated or too many attempts
    if (loading || hasNavigated.current || navigationAttempts.current >= maxNavigationAttempts) {
      return;
    }

    const handleNavigation = () => {
      navigationAttempts.current++;
      console.log(`Index - navigation attempt ${navigationAttempts.current}:`, { 
        isAuthenticated, 
        userRole, 
        loading 
      });
      
      if (isAuthenticated && userRole && !hasNavigated.current) {
        hasNavigated.current = true;
        
        if (userRole === "merchant") {
          console.log('Navigating to merchant dashboard');
          navigate("/merchant", { replace: true });
        } else {
          console.log('Customer authenticated, staying on index');
          setShowRoleSelection(false);
        }
      } else if (!isAuthenticated && !loading) {
        console.log('User not authenticated, showing role selection');
        setShowRoleSelection(true);
      }
    };

    // Small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(handleNavigation, 150);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, userRole, loading, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
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
