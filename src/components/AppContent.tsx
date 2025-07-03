
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import { useCapacitor } from '@/hooks/useCapacitor';
import { setupNativeCapacitor } from '@/setupNativeCapacitor';

// Pages
import Index from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import VerifyPage from '@/pages/VerifyPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFound from '@/pages/NotFound';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';

// Customer Pages
import HomePage from '@/pages/customer/HomePage';
import SearchPage from '@/pages/customer/SearchPage';
import CalendarPage from '@/pages/customer/CalendarPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import MerchantDetailPage from '@/pages/customer/MerchantDetailPage';
import ServiceSelectionPage from '@/pages/customer/ServiceSelectionPage';
import StaffSelectionPage from '@/pages/customer/StaffSelectionPage';
import DateTimeSelectionPage from '@/pages/customer/DateTimeSelectionPage';
import BookingSummaryPage from '@/pages/customer/BookingSummaryPage';
import PaymentPage from '@/pages/customer/PaymentPage';
import ReceiptPage from '@/pages/customer/ReceiptPage';
import BookingsHistoryPage from '@/pages/customer/BookingsHistoryPage';
import MapPage from '@/pages/customer/MapPage';
import NearbyShopsPage from '@/pages/customer/NearbyShopsPage';
import ReviewsPage from '@/pages/customer/ReviewsPage';
import AccountPage from '@/pages/customer/AccountPage';
import SettingsPage from '@/pages/customer/SettingsPage';

// Merchant Pages
import MerchantDashboard from '@/pages/merchant/DashboardPage';
import MerchantOnboarding from '@/pages/merchant/OnboardingPage';
import MerchantProfile from '@/pages/merchant/ProfilePage';
import MerchantServices from '@/pages/merchant/ServicesPage';
import MerchantCalendar from '@/pages/merchant/CalendarManagementPage';
import MerchantEarnings from '@/pages/merchant/EarningsPage';
import MerchantAnalytics from '@/pages/merchant/AnalyticsPage';
import MerchantSettings from '@/pages/merchant/SettingsPage';

// Guest Pages
import GuestBookingPage from '@/pages/guest/GuestBookingPage';
import GuestServiceSelectionPage from '@/pages/guest/GuestServiceSelectionPage';
import GuestStaffSelectionPage from '@/pages/guest/GuestStaffSelectionPage';
import GuestDatetimePage from '@/pages/guest/GuestDatetimePage';
import GuestInfoPage from '@/pages/guest/GuestInfoPage';
import GuestPaymentPage from '@/pages/guest/GuestPaymentPage';
import GuestBookingSuccessPage from '@/pages/guest/GuestBookingSuccessPage';
import GuestBookingHistoryPage from '@/pages/guest/GuestBookingHistoryPage';
import GuestBookingCancellationPage from '@/pages/guest/GuestBookingCancellationPage';
import GuestShopDetailsPage from '@/pages/guest/GuestShopDetailsPage';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import CustomerLayout from '@/layouts/CustomerLayout';
import MerchantLayout from '@/layouts/MerchantLayout';

const AppContent: React.FC = () => {
  const { isAuthenticated, userRole } = useAuth();
  const { isNative, isReady } = useCapacitor();

  useEffect(() => {
    if (isNative && isReady) {
      setupNativeCapacitor();
    }
  }, [isNative, isReady]);

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

        {/* Guest Booking Routes (Public) */}
        <Route path="/guest/:shopSlug" element={<GuestBookingPage />} />
        <Route path="/guest/:shopSlug/services" element={<GuestServiceSelectionPage />} />
        <Route path="/guest/:shopSlug/staff" element={<GuestStaffSelectionPage />} />
        <Route path="/guest/:shopSlug/datetime" element={<GuestDatetimePage />} />
        <Route path="/guest/:shopSlug/info" element={<GuestInfoPage />} />
        <Route path="/guest/:shopSlug/payment" element={<GuestPaymentPage />} />
        <Route path="/guest/:shopSlug/success" element={<GuestBookingSuccessPage />} />
        <Route path="/guest/booking/:bookingId" element={<GuestBookingHistoryPage />} />
        <Route path="/guest/cancel/:bookingId" element={<GuestBookingCancellationPage />} />
        <Route path="/guest/:shopSlug/details" element={<GuestShopDetailsPage />} />

        {/* Customer Protected Routes */}
        <Route path="/home" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <HomePage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/search" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <SearchPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/calendar" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <CalendarPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <ProfilePage />
            </CustomerLayout>
          </ProtectedRoute>
        } />

        {/* Customer Booking Flow */}
        <Route path="/merchant/:merchantId" element={
          <ProtectedRoute requiredRole="customer">
            <MerchantDetailPage />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/:merchantId/services" element={
          <ProtectedRoute requiredRole="customer">
            <ServiceSelectionPage />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/:merchantId/staff" element={
          <ProtectedRoute requiredRole="customer">
            <StaffSelectionPage />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/:merchantId/datetime" element={
          <ProtectedRoute requiredRole="customer">
            <DateTimeSelectionPage />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/:merchantId/summary" element={
          <ProtectedRoute requiredRole="customer">
            <BookingSummaryPage />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/:merchantId/payment" element={
          <ProtectedRoute requiredRole="customer">
            <PaymentPage />
          </ProtectedRoute>
        } />
        
        <Route path="/receipt/:bookingId" element={
          <ProtectedRoute requiredRole="customer">
            <ReceiptPage />
          </ProtectedRoute>
        } />

        {/* Additional Customer Pages */}
        <Route path="/bookings" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <BookingsHistoryPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/map" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <MapPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/nearby" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <NearbyShopsPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/reviews/:merchantId" element={
          <ProtectedRoute requiredRole="customer">
            <ReviewsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/account" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <AccountPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <SettingsPage />
            </CustomerLayout>
          </ProtectedRoute>
        } />

        {/* Merchant Protected Routes */}
        <Route path="/merchant/onboarding" element={
          <ProtectedRoute>
            <MerchantOnboarding />
          </ProtectedRoute>
        } />
        
        <Route path="/merchant" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantDashboard />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/profile" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantProfile />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/services" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantServices />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/calendar" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantCalendar />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/earnings" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantEarnings />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/analytics" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantAnalytics />
            </MerchantLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/merchant/settings" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantLayout>
              <MerchantSettings />
            </MerchantLayout>
          </ProtectedRoute>
        } />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <Toaster />
    </div>
  );
};

export default AppContent;
