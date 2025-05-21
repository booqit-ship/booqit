
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";

// Auth
import AuthPage from "./pages/AuthPage";

// Layouts
import CustomerLayout from "./layouts/CustomerLayout";
import MerchantLayout from "./layouts/MerchantLayout";

// Customer pages
import HomePage from "./pages/customer/HomePage";
// Import other customer pages as needed

// Merchant pages
import OnboardingPage from "./pages/merchant/OnboardingPage";
import DashboardPage from "./pages/merchant/DashboardPage";
// Import other merchant pages as needed

// Not Found
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if we've shown the splash screen before in this session
    const hasSplashBeenShown = sessionStorage.getItem('splashShown');
    
    if (hasSplashBeenShown) {
      setShowSplash(false);
    } else {
      // Set timeout to hide splash screen after 2 seconds
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Customer routes */}
              <Route path="/" element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerLayout />
                </ProtectedRoute>
              }>
                <Route index element={<HomePage />} />
                <Route path="search" element={<div>Search Page (Coming Soon)</div>} />
                <Route path="calendar" element={<div>Calendar Page (Coming Soon)</div>} />
                <Route path="profile" element={<div>Profile Page (Coming Soon)</div>} />
              </Route>

              {/* Merchant routes */}
              <Route path="/merchant/onboarding" element={
                <ProtectedRoute requiredRole="merchant">
                  <OnboardingPage />
                </ProtectedRoute>
              } />
              
              <Route path="/merchant" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="services" element={<div>Services Management (Coming Soon)</div>} />
                <Route path="calendar" element={<div>Calendar Management (Coming Soon)</div>} />
                <Route path="customers" element={<div>Customer Management (Coming Soon)</div>} />
                <Route path="earnings" element={<div>Earnings Page (Coming Soon)</div>} />
                <Route path="profile" element={<div>Profile Page (Coming Soon)</div>} />
              </Route>

              {/* Redirect to auth if not logged in */}
              <Route path="/" element={<Navigate to="/auth" />} />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
