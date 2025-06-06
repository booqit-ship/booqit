
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/SplashScreen';
import CustomerLayout from '@/layouts/CustomerLayout';
import MapPage from '@/pages/customer/MapPage';
import SearchPage from '@/pages/customer/SearchPage';
import CalendarPage from '@/pages/customer/CalendarPage';
import ServiceSelectionPage from '@/pages/customer/ServiceSelectionPage';
import PaymentPage from '@/pages/customer/PaymentPage';
import ReceiptPage from '@/pages/customer/ReceiptPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import UpcomingBookings from '@/components/customer/UpcomingBookings';
import BookingSummaryPage from '@/pages/customer/BookingSummaryPage';
import MerchantLayout from '@/layouts/MerchantLayout';
import CalendarManagementPage from '@/pages/merchant/CalendarManagementPage';
import OnboardingPage from '@/pages/merchant/OnboardingPage';
import ServicesPage from '@/pages/merchant/ServicesPage';
import SettingsPage from '@/pages/merchant/SettingsPage';
import AuthPage from '@/pages/AuthPage';
import Index from '@/pages/Index';
import MerchantBookingSummaryPage from '@/pages/merchant/BookingSummaryPage';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={new QueryClient()}>
      <div className="App">
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} />
            <Route path="/home" element={<Index />} />

            {/* Customer Routes */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<UpcomingBookings />} />
              <Route path="map" element={<MapPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="booking/:merchantId" element={<ServiceSelectionPage />} />
              <Route path="payment/:merchantId" element={<PaymentPage />} />
              <Route path="receipt/:merchantId" element={<ReceiptPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="booking-summary/:merchantId" element={<BookingSummaryPage />} />
            </Route>

            {/* Merchant Routes */}
            <Route path="/merchant" element={<MerchantLayout />}>
              <Route index element={<CalendarManagementPage />} />
              <Route path="calendar" element={<CalendarManagementPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="booking-summary/:bookingId" element={<MerchantBookingSummaryPage />} />
            </Route>

            {/* Catch-all route to redirect to home if not authenticated, or to merchant calendar if merchant */}
            <Route
              path="*"
              element={
                isAuthenticated ? (
                  userRole === 'merchant' ? (
                    <Navigate to="/merchant/calendar" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
          </Routes>
        </Router>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
