import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import ProfilePage from "@/pages/ProfilePage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import MerchantLayout from "@/layouts/MerchantLayout";
import DashboardPage from "@/pages/merchant/DashboardPage";
import OnboardingPage from "@/pages/merchant/OnboardingPage";
import CalendarManagementPage from "@/pages/merchant/CalendarManagementPage";
import ServicesPage from "@/pages/merchant/ServicesPage";
import EarningsPage from "@/pages/merchant/EarningsPage";
import SettingsPage from "@/pages/merchant/SettingsPage";
import { Toaster } from "@/components/ui/toaster";
import EarningsAnalyticsPage from "@/pages/merchant/EarningsAnalyticsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer Routes */}
            <Route path="/home" element={<ProtectedRoute allowedRoles={["customer"]} />}>
              <Route path="" element={<Home />} />
            </Route>

            {/* User Profile Route */}
            <Route path="/profile" element={<ProtectedRoute allowedRoles={["customer", "merchant"]} />}>
              <Route path="" element={<ProfilePage />} />
            </Route>
            
            {/* Merchant Routes */}
            <Route path="/merchant" element={<ProtectedRoute allowedRoles={["merchant"]} />}>
              <Route path="" element={<MerchantLayout />}>
                <Route index element={<Navigate to="/merchant/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="calendar" element={<CalendarManagementPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="analytics" element={<EarningsAnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Not Found Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
