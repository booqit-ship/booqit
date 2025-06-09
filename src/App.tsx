import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SplashScreen from "@/components/SplashScreen";
import NotificationBanner from "@/components/NotificationBanner";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ProfilePage from "@/pages/ProfilePage";
import BookingPage from "@/pages/BookingPage";
import CustomerDashboardPage from "@/pages/CustomerDashboardPage";
import MerchantDashboardPage from "@/pages/MerchantDashboardPage";
import MerchantAvailabilityPage from "@/pages/MerchantAvailabilityPage";
import MerchantServicesPage from "@/pages/MerchantServicesPage";
import MerchantBookingsPage from "@/pages/MerchantBookingsPage";
import MerchantProfilePage from "@/pages/MerchantProfilePage";
import ServiceDetailsPage from "@/pages/ServiceDetailsPage";
import CategoryPage from "@/pages/CategoryPage";
import SearchResultsPage from "@/pages/SearchResultsPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import NotificationTestPage from "@/pages/NotificationTestPage";
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
                <Route path="/auth" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                
                {/* Customer Routes */}
                <Route path="/" element={<ProtectedRoute><CustomerDashboardPage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
                <Route path="/service/:serviceId" element={<ProtectedRoute><ServiceDetailsPage /></ProtectedRoute>} />
                <Route path="/category/:categoryId" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
                
                {/* Merchant Routes */}
                <Route path="/merchant/dashboard" element={<ProtectedRoute requireRole="merchant"><MerchantDashboardPage /></ProtectedRoute>} />
                <Route path="/merchant/availability" element={<ProtectedRoute requireRole="merchant"><MerchantAvailabilityPage /></ProtectedRoute>} />
                <Route path="/merchant/services" element={<ProtectedRoute requireRole="merchant"><MerchantServicesPage /></ProtectedRoute>} />
                <Route path="/merchant/bookings" element={<ProtectedRoute requireRole="merchant"><MerchantBookingsPage /></ProtectedRoute>} />
                <Route path="/merchant/profile" element={<ProtectedRoute requireRole="merchant"><MerchantProfilePage /></ProtectedRoute>} />

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
