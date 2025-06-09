
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';
import NotificationBanner from './components/NotificationBanner';

// Import pages
import Index from './pages/Index';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFound from './pages/NotFound';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import NotificationTestPage from './pages/NotificationTestPage';

// Customer pages
import CustomerLayout from './layouts/CustomerLayout';
import HomePage from './pages/customer/HomePage';
import SearchPage from './pages/customer/SearchPage';
import MapPage from './pages/customer/MapPage';
import MerchantDetailPage from './pages/customer/MerchantDetailPage';
import ServiceSelectionPage from './pages/customer/ServiceSelectionPage';
import StaffSelectionPage from './pages/customer/StaffSelectionPage';
import DateTimeSelectionPage from './pages/customer/DateTimeSelectionPage';
import BookingSummaryPage from './pages/customer/BookingSummaryPage';
import PaymentPage from './pages/customer/PaymentPage';
import ReceiptPage from './pages/customer/ReceiptPage';
import CalendarPage from './pages/customer/CalendarPage';
import CustomerProfilePage from './pages/customer/ProfilePage';

// Merchant pages
import MerchantLayout from './layouts/MerchantLayout';
import DashboardPage from './pages/merchant/DashboardPage';
import OnboardingPage from './pages/merchant/OnboardingPage';
import CalendarManagementPage from './pages/merchant/CalendarManagementPage';
import ServicesPage from './pages/merchant/ServicesPage';
import MerchantProfilePage from './pages/merchant/ProfilePage';
import SettingsPage from './pages/merchant/SettingsPage';
import EarningsPage from './pages/merchant/EarningsPage';
import AnalyticsPage from './pages/merchant/AnalyticsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <SplashScreen />
          <NotificationBanner />
          
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/notification-test" element={<NotificationTestPage />} />

            {/* Customer routes */}
            <Route path="/customer" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="merchant/:merchantId" element={<MerchantDetailPage />} />
              <Route path="merchant/:merchantId/services" element={<ServiceSelectionPage />} />
              <Route path="merchant/:merchantId/staff" element={<StaffSelectionPage />} />
              <Route path="merchant/:merchantId/datetime" element={<DateTimeSelectionPage />} />
              <Route path="merchant/:merchantId/summary" element={<BookingSummaryPage />} />
              <Route path="payment" element={<PaymentPage />} />
              <Route path="receipt/:bookingId" element={<ReceiptPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Merchant routes */}
            <Route path="/merchant" element={
              <ProtectedRoute allowedRoles={['merchant']}>
                <MerchantLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="calendar" element={<CalendarManagementPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="profile" element={<MerchantProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="earnings" element={<EarningsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'white',
                color: '#333',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
