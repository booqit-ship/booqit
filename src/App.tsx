
import React, { useState, useEffect } from "react";
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
import SearchPage from "./pages/customer/SearchPage";
import CalendarPage from "./pages/customer/CalendarPage";
import ProfilePage from "./pages/customer/ProfilePage";
import MapPage from "./pages/customer/MapPage";
import MerchantDetailPage from "./pages/customer/MerchantDetailPage";

// Merchant pages
import OnboardingPage from "./pages/merchant/OnboardingPage";
import DashboardPage from "./pages/merchant/DashboardPage";
import ServicesPage from "./pages/merchant/ServicesPage";
import CalendarManagementPage from "./pages/merchant/CalendarManagementPage";
import CustomersPage from "./pages/merchant/CustomersPage";
import SettingsPage from "./pages/merchant/SettingsPage";
import MerchantProfilePage from "./pages/merchant/ProfilePage";

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
                <Route path="search" element={<SearchPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="map" element={<MapPage />} />
              </Route>

              {/* Merchant detail page - outside layout because it has its own back button */}
              <Route path="/merchant/:merchantId" element={
                <ProtectedRoute requiredRole="customer">
                  <MerchantDetailPage />
                </ProtectedRoute>
              } />

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
                <Route path="services" element={<ServicesPage />} />
                <Route path="calendar" element={<CalendarManagementPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="profile" element={<MerchantProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Redirect root to auth if no match */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
