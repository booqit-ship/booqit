
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SplashScreen from "@/components/SplashScreen";
import NotificationBanner from "@/components/NotificationBanner";
import AuthPage from "@/pages/AuthPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import NotificationTestPage from "@/pages/NotificationTestPage";
import Index from "@/pages/Index";

// Customer Pages
import ProfilePage from "@/pages/customer/ProfilePage";
import MerchantDetailPage from "@/pages/customer/MerchantDetailPage";
import HomePage from "@/pages/customer/HomePage";
import ServiceSelectionPage from "@/pages/customer/ServiceSelectionPage";
import SearchPage from "@/pages/customer/SearchPage";
import MapPage from "@/pages/customer/MapPage";

// Merchant Pages
import DashboardPage from "@/pages/merchant/DashboardPage";
import CalendarManagementPage from "@/pages/merchant/CalendarManagementPage";
import ServicesPage from "@/pages/merchant/ServicesPage";
import MerchantProfilePage from "@/pages/merchant/ProfilePage";

import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <div className="min-h-screen bg-background font-sans antialiased">
              <NotificationBanner />
              <Routes>
                <Route path="/splash" element={<SplashScreen />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                
                {/* Customer Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId" element={<ProtectedRoute><MerchantDetailPage /></ProtectedRoute>} />
                <Route path="/service/:serviceId" element={<ProtectedRoute><ServiceSelectionPage /></ProtectedRoute>} />
                <Route path="/category/:categoryId" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                
                {/* Merchant Routes */}
                <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><DashboardPage /></ProtectedRoute>} />
                <Route path="/merchant/dashboard" element={<ProtectedRoute requiredRole="merchant"><DashboardPage /></ProtectedRoute>} />
                <Route path="/merchant/availability" element={<ProtectedRoute requiredRole="merchant"><CalendarManagementPage /></ProtectedRoute>} />
                <Route path="/merchant/calendar" element={<ProtectedRoute requiredRole="merchant"><CalendarManagementPage /></ProtectedRoute>} />
                <Route path="/merchant/services" element={<ProtectedRoute requiredRole="merchant"><ServicesPage /></ProtectedRoute>} />
                <Route path="/merchant/bookings" element={<ProtectedRoute requiredRole="merchant"><CalendarManagementPage /></ProtectedRoute>} />
                <Route path="/merchant/profile" element={<ProtectedRoute requiredRole="merchant"><MerchantProfilePage /></ProtectedRoute>} />

                {/* Testing Route - remove in production */}
                <Route path="/notification-test" element={<ProtectedRoute><NotificationTestPage /></ProtectedRoute>} />
                
                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
