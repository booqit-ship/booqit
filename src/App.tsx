
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleSelection from '@/components/RoleSelection';
import CustomerLayout from '@/layouts/CustomerLayout';
import MerchantLayout from '@/layouts/MerchantLayout';
import ShopResolver from '@/components/ShopResolver';

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';

const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyPage = lazy(() => import('@/pages/VerifyPage'));

// Customer pages
const HomePage = lazy(() => import('@/pages/customer/HomePage'));
const NearbyShopsPage = lazy(() => import('@/pages/customer/NearbyShopsPage'));
const SearchPage = lazy(() => import('@/pages/customer/SearchPage'));
const MapPage = lazy(() => import('@/pages/customer/MapPage'));
const MerchantDetailPage = lazy(() => import('@/pages/customer/MerchantDetailPage'));
const ServiceSelectionPage = lazy(() => import('@/pages/customer/ServiceSelectionPage'));
const StaffSelectionPage = lazy(() => import('@/pages/customer/StaffSelectionPage'));
const DateTimeSelectionPage = lazy(() => import('@/pages/customer/DateTimeSelectionPage'));
const BookingSummaryPage = lazy(() => import('@/pages/customer/BookingSummaryPage'));
const PaymentPage = lazy(() => import('@/pages/customer/PaymentPage'));
const ReceiptPage = lazy(() => import('@/pages/customer/ReceiptPage'));
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'));
const AccountPage = lazy(() => import('@/pages/customer/AccountPage'));
const BookingsHistoryPage = lazy(() => import('@/pages/customer/BookingsHistoryPage'));
const SettingsPage = lazy(() => import('@/pages/customer/SettingsPage'));
const ReviewsPage = lazy(() => import('@/pages/customer/ReviewsPage'));

// Settings pages
const NotificationsPage = lazy(() => import('@/pages/settings/NotificationsPage'));
const AccountInformationPage = lazy(() => import('@/pages/settings/AccountInformationPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/settings/PrivacyPolicyPage'));
const TermsConditionsPage = lazy(() => import('@/pages/settings/TermsConditionsPage'));
const AboutPage = lazy(() => import('@/pages/settings/AboutPage'));
const ContactPage = lazy(() => import('@/pages/settings/ContactPage'));
const DeleteAccountPage = lazy(() => import('@/pages/settings/DeleteAccountPage'));

// Merchant pages
const MerchantDashboardPage = lazy(() => import('@/pages/merchant/DashboardPage'));
const MerchantOnboardingPage = lazy(() => import('@/pages/merchant/OnboardingPage'));
const MerchantServicesPage = lazy(() => import('@/pages/merchant/ServicesPage'));
const MerchantCalendarPage = lazy(() => import('@/pages/merchant/CalendarManagementPage'));
const MerchantProfilePage = lazy(() => import('@/pages/merchant/ProfilePage'));
const MerchantSettingsPage = lazy(() => import('@/pages/merchant/SettingsPage'));
const MerchantAnalyticsPage = lazy(() => import('@/pages/merchant/AnalyticsPage'));
const MerchantEarningsPage = lazy(() => import('@/pages/merchant/EarningsPage'));

// Merchant settings pages
const MerchantBusinessInformationPage = lazy(() => import('@/pages/merchant/settings/BusinessInformationPage'));
const MerchantBankingDetailsPage = lazy(() => import('@/pages/merchant/settings/BankingDetailsPage'));
const MerchantPrivacyPolicyPage = lazy(() => import('@/pages/merchant/settings/PrivacyPolicyPage'));
const MerchantTermsConditionsPage = lazy(() => import('@/pages/merchant/settings/TermsConditionsPage'));
const MerchantAboutPage = lazy(() => import('@/pages/merchant/settings/AboutPage'));
const MerchantContactPage = lazy(() => import('@/pages/merchant/settings/ContactPage'));
const MerchantDeleteAccountPage = lazy(() => import('@/pages/merchant/settings/DeleteAccountPage'));

// Guest pages
const GuestInfoPage = lazy(() => import('@/pages/guest/GuestInfoPage'));
const GuestServiceSelectionPage = lazy(() => import('@/pages/guest/GuestServiceSelectionPage'));
const GuestStaffSelectionPage = lazy(() => import('@/pages/guest/GuestStaffSelectionPage'));
const GuestDatetimePage = lazy(() => import('@/pages/guest/GuestDatetimePage'));
const GuestBookingPage = lazy(() => import('@/pages/guest/GuestBookingPage'));
const GuestPaymentPage = lazy(() => import('@/pages/guest/GuestPaymentPage'));
const GuestBookingSuccessPage = lazy(() => import('@/pages/guest/GuestBookingSuccessPage'));
const GuestBookingHistoryPage = lazy(() => import('@/pages/guest/GuestBookingHistoryPage'));
const GuestBookingCancellationPage = lazy(() => import('@/pages/guest/GuestBookingCancellationPage'));

// Static pages
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
  </div>
);

function App() {
  const handleRoleSelect = (role: string) => {
    // Navigate to auth page with selected role
    window.location.href = `/auth?role=${role}`;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="App">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Auth routes */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/role-selection" element={<RoleSelection onRoleSelect={handleRoleSelect} />} />

                {/* Static pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

                {/* Customer routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <HomePage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                {/* Specific customer routes - MUST come before dynamic routes */}
                <Route path="/nearby-shops" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <NearbyShopsPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/search" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <SearchPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/map" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <MapPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <MerchantDetailPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/service-selection/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <ServiceSelectionPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/staff-selection/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <StaffSelectionPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/datetime-selection/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <DateTimeSelectionPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/booking-summary/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <BookingSummaryPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/payment/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <PaymentPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/receipt/:bookingId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <ReceiptPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <ProfilePage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/account" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <AccountPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/bookings" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <BookingsHistoryPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <SettingsPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                <Route path="/reviews/:merchantId" element={
                  <ProtectedRoute>
                    <CustomerLayout>
                      <ReviewsPage />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />

                {/* Settings routes */}
                <Route path="/settings/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/account" element={
                  <ProtectedRoute>
                    <AccountInformationPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/privacy" element={
                  <ProtectedRoute>
                    <PrivacyPolicyPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/terms" element={
                  <ProtectedRoute>
                    <TermsConditionsPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/about" element={
                  <ProtectedRoute>
                    <AboutPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/contact" element={
                  <ProtectedRoute>
                    <ContactPage />
                  </ProtectedRoute>
                } />

                <Route path="/settings/delete-account" element={
                  <ProtectedRoute>
                    <DeleteAccountPage />
                  </ProtectedRoute>
                } />

                {/* Merchant routes */}
                <Route path="/merchant-dashboard" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantDashboardPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-onboarding" element={
                  <ProtectedRoute>
                    <MerchantOnboardingPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-services" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantServicesPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-calendar" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantCalendarPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-profile" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantProfilePage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantSettingsPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-analytics" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantAnalyticsPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                <Route path="/merchant-earnings" element={
                  <ProtectedRoute>
                    <MerchantLayout>
                      <MerchantEarningsPage />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />

                {/* Merchant settings routes */}
                <Route path="/merchant-settings/business" element={
                  <ProtectedRoute>
                    <MerchantBusinessInformationPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/banking" element={
                  <ProtectedRoute>
                    <MerchantBankingDetailsPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/privacy" element={
                  <ProtectedRoute>
                    <MerchantPrivacyPolicyPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/terms" element={
                  <ProtectedRoute>
                    <MerchantTermsConditionsPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/about" element={
                  <ProtectedRoute>
                    <MerchantAboutPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/contact" element={
                  <ProtectedRoute>
                    <MerchantContactPage />
                  </ProtectedRoute>
                } />

                <Route path="/merchant-settings/delete-account" element={
                  <ProtectedRoute>
                    <MerchantDeleteAccountPage />
                  </ProtectedRoute>
                } />

                {/* Guest routes - no auth required */}
                <Route path="/guest-info/:merchantId" element={<GuestInfoPage />} />
                <Route path="/guest-service-selection/:merchantId" element={<GuestServiceSelectionPage />} />
                <Route path="/guest-staff-selection/:merchantId" element={<GuestStaffSelectionPage />} />
                <Route path="/guest-datetime/:merchantId" element={<GuestDatetimePage />} />
                <Route path="/guest-booking/:merchantId" element={<GuestBookingPage />} />
                <Route path="/guest-payment/:merchantId" element={<GuestPaymentPage />} />
                <Route path="/guest-success/:bookingId" element={<GuestBookingSuccessPage />} />
                <Route path="/guest-bookings/:guestUserId" element={<GuestBookingHistoryPage />} />
                <Route path="/guest-cancel/:bookingId" element={<GuestBookingCancellationPage />} />

                {/* Dynamic shop slug routes - MUST come last to avoid conflicts */}
                <Route path="/:shopSlug" element={<ShopResolver><div /></ShopResolver>} />

                {/* 404 route */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
            <Toaster />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
