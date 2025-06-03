
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
    if (isAuthenticated) {
      if (userRole === "merchant") {
        navigate("/merchant");
      } else {
        navigate("/");
      }
    } else {
      // Show role selection instead of redirecting directly to auth
      setShowRoleSelection(true);
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleRoleSelect = (role: UserRole) => {
    // Navigate to auth page with selected role
    navigate("/auth", { state: { selectedRole: role } });
  };

  if (showRoleSelection) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <h1 className="text-2xl font-righteous mb-2">Loading BooqIt</h1>
        <p className="text-gray-500 font-poppins">Please wait...</p>
      </div>
    </div>
  );
};

export default Index;
