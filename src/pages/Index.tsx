
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === "merchant") {
        navigate("/merchant");
      } else {
        navigate("/");
      }
    } else {
      navigate("/auth");
    }
  }, [isAuthenticated, userRole, navigate]);

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
