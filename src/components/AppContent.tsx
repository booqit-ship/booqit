
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import CustomerLayout from '@/layouts/CustomerLayout';
import MerchantLayout from '@/layouts/MerchantLayout';

// Import pages
import Index from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyPage from '@/pages/VerifyPage';
import NotFound from '@/pages/NotFound';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';

// Customer pages
import HomePage from '@/pages/customer/HomePage';
import NearbyShopsPage from '@/pages/customer/NearbyShopsPage';
import SearchPage from '@/pages/customer/SearchPage';
import MapPage from '@/pages/customer/MapPage';
import MerchantDetailPage from '@/pages/customer/MerchantDetailPage';
import ServiceSelectionPage from '@/pages/customer/ServiceSelectionPage';
import StaffSelectionPage from '@/pages/customer/StaffSelectionPage';
import DateTimeSelectionPage from '@/pages/customer/DateTimeSelectionPage';
import BookingSummaryPage from '@/pages/customer/BookingSummaryPage';
import PaymentPage from '@/pages/customer/PaymentPage';
import ReceiptPage from '@/pages/customer/ReceiptPage';
import CalendarPage from '@/pages/customer/CalendarPage';
import BookingsHistoryPage from '@/pages/customer/BookingsHistoryPage';
import AccountPage from '@/pages/customer/AccountPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import SettingsPage from '@/pages/customer/SettingsPage';
import ReviewsPage from '@/pages/customer/ReviewsPage';

// Customer settings pages
import AccountInformationPage from '@/pages/settings/AccountInformationPage';
import NotificationsPage from '@/pages/settings/NotificationsPage';
import AboutPage from '@/pages/settings/AboutPage';
import ContactPage from '@/pages/settings/ContactPage';
import DeleteAccountPage from '@/pages/settings/DeleteAccountPage';
import PrivacyPolicyPage from '@/pages/settings/PrivacyPolicyPage';
import TermsConditionsPage from '@/pages/settings/TermsConditionsPage';

// Merchant pages
import OnboardingPage from '@/pages/merchant/OnboardingPage';
import DashboardPage from '@/pages/merchant/DashboardPage';
import ServicesPage from '@/pages/merchant/ServicesPage';
import CalendarManagementPage from '@/pages/merchant/CalendarManagementPage';
import EarningsPage from '@/pages/merchant/EarningsPage';
import AnalyticsPage from '@/pages/merchant/AnalyticsPage';
import MerchantProfilePage from '@/pages/merchant/ProfilePage';
import MerchantSettingsPage from '@/pages/merchant/SettingsPage';

// Merchant settings pages
import BusinessInformationPage from '@/pages/merchant/settings/BusinessInformationPage';
import BankingDetailsPage from '@/pages/merchant/settings/BankingDetailsPage';
import MerchantAboutPage from '@/pages/merchant/settings/AboutPage';
import MerchantContactPage from '@/pages/merchant/settings/ContactPage';
import MerchantDeleteAccountPage from '@/pages/merchant/settings/DeleteAccountPage';
import MerchantPrivacyPolicyPage from '@/pages/merchant/settings/PrivacyPolicyPage';
import MerchantTermsConditionsPage from '@/pages/merchant/settings/TermsConditionsPage';

const AppContent: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsAndConditions />} />

          {/* Customer routes */}
          <Route path="/customer/*" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/nearby-shops" element={<NearbyShopsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/merchant/:id" element={<MerchantDetailPage />} />
                  <Route path="/merchant/:id/reviews" element={<ReviewsPage />} />
                  <Route path="/booking/:merchantId/services" element={<ServiceSelectionPage />} />
                  <Route path="/booking/:merchantId/staff" element={<StaffSelectionPage />} />
                  <Route path="/booking/:merchantId/datetime" element={<DateTimeSelectionPage />} />
                  <Route path="/booking/:bookingId/summary" element={<BookingSummaryPage />} />
                  <Route path="/payment/:bookingId" element={<PaymentPage />} />
                  <Route path="/receipt/:bookingId" element={<ReceiptPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/bookings" element={<BookingsHistoryPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/account" element={<AccountInformationPage />} />
                  <Route path="/settings/notifications" element={<NotificationsPage />} />
                  <Route path="/settings/about" element={<AboutPage />} />
                  <Route path="/settings/contact" element={<ContactPage />} />
                  <Route path="/settings/delete-account" element={<DeleteAccountPage />} />
                  <Route path="/settings/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/settings/terms-conditions" element={<TermsConditionsPage />} />
                </Routes>
              </CustomerLayout>
            </ProtectedRoute>
          } />

          {/* Direct customer routes (for backward compatibility) */}
          <Route path="/home" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <HomePage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/nearby-shops" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <NearbyShopsPage />
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
          <Route path="/map" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <MapPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant/:id" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <MerchantDetailPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant/:id/reviews" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <ReviewsPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/booking/:merchantId/services" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <ServiceSelectionPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/booking/:merchantId/staff" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <StaffSelectionPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/booking/:merchantId/datetime" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <DateTimeSelectionPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/booking/:bookingId/summary" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <BookingSummaryPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/payment/:bookingId" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <PaymentPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/receipt/:bookingId" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <ReceiptPage />
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
          <Route path="/bookings" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <BookingsHistoryPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/account" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <AccountPage />
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
          <Route path="/settings" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <SettingsPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/account" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <AccountInformationPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/notifications" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <NotificationsPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/about" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <AboutPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/contact" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <ContactPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/delete-account" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <DeleteAccountPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/privacy-policy" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <PrivacyPolicyPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/terms-conditions" element={
            <ProtectedRoute requiredRole="customer">
              <CustomerLayout>
                <TermsConditionsPage />
              </CustomerLayout>
            </ProtectedRoute>
          } />

          {/* Merchant routes */}
          <Route path="/merchant/*" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/calendar" element={<CalendarManagementPage />} />
                  <Route path="/earnings" element={<EarningsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/profile" element={<MerchantProfilePage />} />
                  <Route path="/settings" element={<MerchantSettingsPage />} />
                  <Route path="/settings/business" element={<BusinessInformationPage />} />
                  <Route path="/settings/banking" element={<BankingDetailsPage />} />
                  <Route path="/settings/about" element={<MerchantAboutPage />} />
                  <Route path="/settings/contact" element={<MerchantContactPage />} />
                  <Route path="/settings/delete-account" element={<MerchantDeleteAccountPage />} />
                  <Route path="/settings/privacy-policy" element={<MerchantPrivacyPolicyPage />} />
                  <Route path="/settings/terms-conditions" element={<MerchantTermsConditionsPage />} />
                </Routes>
              </MerchantLayout>
            </ProtectedRoute>
          } />

          {/* Direct merchant routes (for backward compatibility) */}
          <Route path="/merchant-onboarding" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <OnboardingPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-dashboard" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <DashboardPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-services" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <ServicesPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-calendar" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <CalendarManagementPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-earnings" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <EarningsPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-analytics" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <AnalyticsPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-profile" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantProfilePage />
              </MerchantLayout>
            </ProtectedRoute>
          } />
          <Route path="/merchant-settings" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantSettingsPage />
              </MerchantLayout>
            </ProtectedRoute>
          } />

          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default AppContent;
