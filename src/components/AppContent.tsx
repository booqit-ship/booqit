
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashScreen } from '@/components/SplashScreen';
import { AppInit } from '@/components/AppInit';
import ShopResolver from '@/components/ShopResolver';

// Lazy load components
const LazyRoute = React.lazy(() => import('@/components/LazyRoute'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <AppInit>
            <Router>
              <Suspense fallback={<SplashScreen />}>
                <Routes>
                  {/* Static routes first */}
                  <Route path="/nearby-shops" element={<LazyRoute component="customer/NearbyShopsPage" />} />
                  <Route path="/home" element={<LazyRoute component="customer/HomePage" />} />
                  <Route path="/auth" element={<LazyRoute component="AuthPage" />} />
                  <Route path="/forgot-password" element={<LazyRoute component="ForgotPasswordPage" />} />
                  <Route path="/reset-password" element={<LazyRoute component="ResetPasswordPage" />} />
                  <Route path="/verify" element={<LazyRoute component="VerifyPage" />} />
                  <Route path="/privacy-policy" element={<LazyRoute component="PrivacyPolicy" />} />
                  <Route path="/terms-and-conditions" element={<LazyRoute component="TermsAndConditions" />} />
                  <Route path="/search" element={<LazyRoute component="customer/SearchPage" />} />
                  <Route path="/map" element={<LazyRoute component="customer/MapPage" />} />
                  <Route path="/bookings" element={<LazyRoute component="customer/BookingsHistoryPage" />} />
                  <Route path="/settings" element={<LazyRoute component="customer/SettingsPage" />} />
                  <Route path="/profile" element={<LazyRoute component="customer/ProfilePage" />} />
                  <Route path="/account" element={<LazyRoute component="customer/AccountPage" />} />
                  <Route path="/reviews" element={<LazyRoute component="customer/ReviewsPage" />} />
                  <Route path="/calendar" element={<LazyRoute component="customer/CalendarPage" />} />
                  
                  {/* Merchant routes */}
                  <Route path="/merchant/dashboard" element={<LazyRoute component="merchant/DashboardPage" />} />
                  <Route path="/merchant/calendar" element={<LazyRoute component="merchant/CalendarManagementPage" />} />
                  <Route path="/merchant/services" element={<LazyRoute component="merchant/ServicesPage" />} />
                  <Route path="/merchant/analytics" element={<LazyRoute component="merchant/AnalyticsPage" />} />
                  <Route path="/merchant/earnings" element={<LazyRoute component="merchant/EarningsPage" />} />
                  <Route path="/merchant/profile" element={<LazyRoute component="merchant/ProfilePage" />} />
                  <Route path="/merchant/settings" element={<LazyRoute component="merchant/SettingsPage" />} />
                  <Route path="/merchant/onboarding" element={<LazyRoute component="merchant/OnboardingPage" />} />
                  
                  {/* Booking flow routes */}
                  <Route path="/merchant/:merchantId" element={<LazyRoute component="customer/MerchantDetailPage" />} />
                  <Route path="/booking/:merchantId/services" element={<LazyRoute component="customer/ServiceSelectionPage" />} />
                  <Route path="/booking/:merchantId/staff" element={<LazyRoute component="customer/StaffSelectionPage" />} />
                  <Route path="/booking/:merchantId/datetime" element={<LazyRoute component="customer/DateTimeSelectionPage" />} />
                  <Route path="/booking/:merchantId/summary" element={<LazyRoute component="customer/BookingSummaryPage" />} />
                  <Route path="/booking/:merchantId/payment" element={<LazyRoute component="customer/PaymentPage" />} />
                  <Route path="/booking/:merchantId/receipt" element={<LazyRoute component="customer/ReceiptPage" />} />
                  
                  {/* Guest booking routes */}
                  <Route path="/guest-info/:merchantId" element={<LazyRoute component="guest/GuestInfoPage" />} />
                  <Route path="/guest/booking/:merchantId" element={<LazyRoute component="guest/GuestBookingPage" />} />
                  <Route path="/guest/services/:merchantId" element={<LazyRoute component="guest/GuestServiceSelectionPage" />} />
                  <Route path="/guest/staff/:merchantId" element={<LazyRoute component="guest/GuestStaffSelectionPage" />} />
                  <Route path="/guest/datetime/:merchantId" element={<LazyRoute component="guest/GuestDatetimePage" />} />
                  <Route path="/guest/payment/:merchantId" element={<LazyRoute component="guest/GuestPaymentPage" />} />
                  <Route path="/guest/success/:bookingId" element={<LazyRoute component="guest/GuestBookingSuccessPage" />} />
                  <Route path="/guest/history/:guestUserId" element={<LazyRoute component="guest/GuestBookingHistoryPage" />} />
                  <Route path="/guest/cancel/:bookingId" element={<LazyRoute component="guest/GuestBookingCancellationPage" />} />
                  <Route path="/guest/shop/:merchantId" element={<LazyRoute component="guest/GuestShopDetailsPage" />} />
                  
                  {/* Settings routes */}
                  <Route path="/settings/notifications" element={<LazyRoute component="settings/NotificationsPage" />} />
                  <Route path="/settings/account-information" element={<LazyRoute component="settings/AccountInformationPage" />} />
                  <Route path="/settings/privacy-policy" element={<LazyRoute component="settings/PrivacyPolicyPage" />} />
                  <Route path="/settings/terms-conditions" element={<LazyRoute component="settings/TermsConditionsPage" />} />
                  <Route path="/settings/about" element={<LazyRoute component="settings/AboutPage" />} />
                  <Route path="/settings/contact" element={<LazyRoute component="settings/ContactPage" />} />
                  <Route path="/settings/delete-account" element={<LazyRoute component="settings/DeleteAccountPage" />} />
                  
                  {/* Merchant settings routes */}
                  <Route path="/merchant/settings/business-information" element={<LazyRoute component="merchant/settings/BusinessInformationPage" />} />
                  <Route path="/merchant/settings/banking-details" element={<LazyRoute component="merchant/settings/BankingDetailsPage" />} />
                  <Route path="/merchant/settings/privacy-policy" element={<LazyRoute component="merchant/settings/PrivacyPolicyPage" />} />
                  <Route path="/merchant/settings/terms-conditions" element={<LazyRoute component="merchant/settings/TermsConditionsPage" />} />
                  <Route path="/merchant/settings/about" element={<LazyRoute component="merchant/settings/AboutPage" />} />
                  <Route path="/merchant/settings/contact" element={<LazyRoute component="merchant/settings/ContactPage" />} />
                  <Route path="/merchant/settings/delete-account" element={<LazyRoute component="merchant/settings/DeleteAccountPage" />} />
                  
                  {/* Default route */}
                  <Route path="/" element={<LazyRoute component="Index" />} />
                  
                  {/* Shop resolver for custom URLs - must be last */}
                  <Route path="/:shopSlug" element={<ShopResolver><div /></ShopResolver>} />
                  
                  {/* 404 route */}
                  <Route path="*" element={<LazyRoute component="NotFound" />} />
                </Routes>
              </Suspense>
              <Toaster />
            </Router>
          </AppInit>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default AppContent;
