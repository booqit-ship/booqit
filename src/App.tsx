import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

// Auth Pages - using correct paths
import LoginPage from '@/pages/AuthPage';
import SignupPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyPage';

// Customer Pages - using correct paths
import CustomerDashboard from '@/pages/customer/HomePage';
import BookingPage from '@/pages/customer/ServiceSelectionPage';
import CustomerBookingsPage from '@/pages/customer/BookingsHistoryPage';
import CustomerProfilePage from '@/pages/customer/ProfilePage';

// Merchant Pages - using correct paths
import MerchantDashboard from '@/pages/merchant/DashboardPage';
import MerchantBookingsPage from '@/pages/merchant/CalendarManagementPage';
import MerchantServicesPage from '@/pages/merchant/ServicesPage';
import MerchantStaffPage from '@/pages/merchant/ServicesPage';
import MerchantProfilePage from '@/pages/merchant/ProfilePage';
import MerchantSetupPage from '@/pages/merchant/OnboardingPage';

// Guest Pages
import GuestBookingPage from '@/pages/guest/GuestBookingPage';
import GuestInfoPage from '@/pages/guest/GuestInfoPage';
import GuestStaffSelectionPage from '@/pages/guest/GuestStaffSelectionPage';
import GuestDateTimeSelectionPage from '@/pages/guest/GuestDatetimePage';
import GuestBookingSuccessPage from '@/pages/guest/GuestBookingSuccessPage';
import GuestBookingCancellationPage from '@/pages/guest/GuestBookingCancellationPage';
import GuestBookingHistoryPage from '@/pages/guest/GuestBookingHistoryPage';

// Public Pages
import LandingPage from '@/pages/Index';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'customer' | 'merchant' }> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.user_metadata?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects authenticated users)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (user) {
    const role = user.user_metadata?.role;
    if (role === 'merchant') {
      return <Navigate to="/merchant/dashboard" replace />;
    } else {
      return <Navigate to="/customer/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify" element={<VerifyEmailPage />} />

              {/* Customer Routes */}
              <Route path="/customer/dashboard" element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/customer/book/:merchantId" element={
                <ProtectedRoute requiredRole="customer">
                  <BookingPage />
                </ProtectedRoute>
              } />
              <Route path="/customer/bookings" element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerBookingsPage />
                </ProtectedRoute>
              } />
              <Route path="/customer/profile" element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerProfilePage />
                </ProtectedRoute>
              } />

              {/* Merchant Routes */}
              <Route path="/merchant/setup" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantSetupPage />
                </ProtectedRoute>
              } />
              <Route path="/merchant/dashboard" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantDashboard />
                </ProtectedRoute>
              } />
              <Route path="/merchant/bookings" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantBookingsPage />
                </ProtectedRoute>
              } />
              <Route path="/merchant/services" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantServicesPage />
                </ProtectedRoute>
              } />
              <Route path="/merchant/staff" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantStaffPage />
                </ProtectedRoute>
              } />
              <Route path="/merchant/profile" element={
                <ProtectedRoute requiredRole="merchant">
                  <MerchantProfilePage />
                </ProtectedRoute>
              } />

              {/* Guest Booking Routes */}
              <Route path="/book/:merchantId" element={<GuestBookingPage />} />
              <Route path="/guest-info/:merchantId" element={<GuestInfoPage />} />
              <Route path="/guest-staff/:merchantId" element={<GuestStaffSelectionPage />} />
              <Route path="/guest-datetime/:merchantId" element={<GuestDateTimeSelectionPage />} />
              <Route path="/guest-success/:merchantId" element={<GuestBookingSuccessPage />} />

              {/* Guest Booking Management Routes */}
              <Route path="/guest-cancel-booking" element={<GuestBookingCancellationPage />} />
              <Route path="/guest-booking-history" element={<GuestBookingHistoryPage />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-center" richColors />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
