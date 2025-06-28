
import { useState, useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import LazyRoute from "./components/LazyRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load components
const Index = LazyRoute(() => import("./pages/Index"));
const AuthPage = LazyRoute(() => import("./pages/AuthPage"));
const PhoneAuthPage = LazyRoute(() => import("./pages/PhoneAuthPage"));
const MerchantDashboard = LazyRoute(() => import("./pages/merchant/DashboardPage"));
const MerchantProfilePage = LazyRoute(() => import("./pages/merchant/ProfilePage"));
const MerchantOnboardingPage = LazyRoute(() => import("./pages/merchant/OnboardingPage"));
const CustomerHomePage = LazyRoute(() => import("./pages/customer/HomePage"));
const CustomerProfilePage = LazyRoute(() => import("./pages/customer/ProfilePage"));
const MerchantDetailPage = LazyRoute(() => import("./pages/customer/MerchantDetailPage"));
const ServiceSelectionPage = LazyRoute(() => import("./pages/customer/ServiceSelectionPage"));
const StaffSelectionPage = LazyRoute(() => import("./pages/customer/StaffSelectionPage"));
const DateTimeSelectionPage = LazyRoute(() => import("./pages/customer/DateTimeSelectionPage"));
const BookingConfirmationPage = LazyRoute(() => import("./pages/customer/BookingSummaryPage"));
const BookingSuccessPage = LazyRoute(() => import("./pages/guest/GuestBookingSuccessPage"));
const BookingDetailsPage = LazyRoute(() => import("./pages/customer/BookingDetailsPage"));
const PrivacyPolicyPage = LazyRoute(() => import("./pages/PrivacyPolicy"));
const TermsAndConditionsPage = LazyRoute(() => import("./pages/TermsAndConditions"));
const ForgotPasswordPage = LazyRoute(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = LazyRoute(() => import("./pages/ResetPasswordPage"));

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simulate a loading process
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/phone-auth" element={<PhoneAuthPage />} />

                {/* Merchant Routes */}
                <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
                <Route path="/merchant/profile" element={<ProtectedRoute requiredRole="merchant"><MerchantProfilePage /></ProtectedRoute>} />
                <Route path="/merchant/onboarding" element={<ProtectedRoute requiredRole="merchant"><MerchantOnboardingPage /></ProtectedRoute>} />

                {/* Customer Routes */}
                <Route path="/home" element={<ProtectedRoute requiredRole="customer"><CustomerHomePage /></ProtectedRoute>} />
                <Route path="/customer/profile" element={<ProtectedRoute requiredRole="customer"><CustomerProfilePage /></ProtectedRoute>} />
                <Route path="/merchant/:merchantId" element={<ProtectedRoute requiredRole="customer"><MerchantDetailPage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId/services" element={<ProtectedRoute requiredRole="customer"><ServiceSelectionPage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId/staff" element={<ProtectedRoute requiredRole="customer"><StaffSelectionPage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId/datetime" element={<ProtectedRoute requiredRole="customer"><DateTimeSelectionPage /></ProtectedRoute>} />
                <Route path="/booking/:merchantId/confirmation" element={<ProtectedRoute requiredRole="customer"><BookingConfirmationPage /></ProtectedRoute>} />
                <Route path="/booking/success" element={<ProtectedRoute requiredRole="customer"><BookingSuccessPage /></ProtectedRoute>} />
                <Route path="/booking/:bookingId/details" element={<ProtectedRoute><BookingDetailsPage /></ProtectedRoute>} />

                {/* Auth Routes */}
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
