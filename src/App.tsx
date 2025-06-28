
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';
import LazyRoute from './components/LazyRoute';
import ShopResolver from './components/ShopResolver';

// Lazy load pages
const Index = React.lazy(() => import('./pages/Index'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const VerifyPage = React.lazy(() => import('./pages/VerifyPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Customer pages
const HomePage = React.lazy(() => import('./pages/customer/HomePage'));
const MerchantDetailPage = React.lazy(() => import('./pages/customer/MerchantDetailPage'));
const ServiceSelectionPage = React.lazy(() => import('./pages/customer/ServiceSelectionPage'));
const StaffSelectionPage = React.lazy(() => import('./pages/customer/StaffSelectionPage'));
const DateTimeSelectionPage = React.lazy(() => import('./pages/customer/DateTimeSelectionPage'));
const BookingSummaryPage = React.lazy(() => import('./pages/customer/BookingSummaryPage'));
const PaymentPage = React.lazy(() => import('./pages/customer/PaymentPage'));
const ReceiptPage = React.lazy(() => import('./pages/customer/ReceiptPage'));
const BookingsHistoryPage = React.lazy(() => import('./pages/customer/BookingsHistoryPage'));
const ProfilePage = React.lazy(() => import('./pages/customer/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/customer/SettingsPage'));
const SearchPage = React.lazy(() => import('./pages/customer/SearchPage'));
const MapPage = React.lazy(() => import('./pages/customer/MapPage'));
const NearbyShopsPage = React.lazy(() => import('./pages/customer/NearbyShopsPage'));
const ReviewsPage = React.lazy(() => import('./pages/customer/ReviewsPage'));
const CalendarPage = React.lazy(() => import('./pages/customer/CalendarPage'));
const AccountPage = React.lazy(() => import('./pages/customer/AccountPage'));

// Settings pages
const AccountInformationPage = React.lazy(() => import('./pages/settings/AccountInformationPage'));
const NotificationsPage = React.lazy(() => import('./pages/settings/NotificationsPage'));
const AboutPage = React.lazy(() => import('./pages/settings/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/settings/ContactPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/settings/PrivacyPolicyPage'));
const TermsConditionsPage = React.lazy(() => import('./pages/settings/TermsConditionsPage'));
const DeleteAccountPage = React.lazy(() => import('./pages/settings/DeleteAccountPage'));

// Merchant pages
const MerchantDashboardPage = React.lazy(() => import('./pages/merchant/DashboardPage'));
const MerchantProfilePage = React.lazy(() => import('./pages/merchant/ProfilePage'));
const MerchantServicesPage = React.lazy(() => import('./pages/merchant/ServicesPage'));
const MerchantCalendarPage = React.lazy(() => import('./pages/merchant/CalendarManagementPage'));
const MerchantEarningsPage = React.lazy(() => import('./pages/merchant/EarningsPage'));
const MerchantAnalyticsPage = React.lazy(() => import('./pages/merchant/AnalyticsPage'));
const MerchantSettingsPage = React.lazy(() => import('./pages/merchant/SettingsPage'));
const MerchantOnboardingPage = React.lazy(() => import('./pages/merchant/OnboardingPage'));

// Merchant settings pages
const MerchantBusinessInformationPage = React.lazy(() => import('./pages/merchant/settings/BusinessInformationPage'));
const MerchantBankingDetailsPage = React.lazy(() => import('./pages/merchant/settings/BankingDetailsPage'));
const MerchantAboutPage = React.lazy(() => import('./pages/merchant/settings/AboutPage'));
const MerchantContactPage = React.lazy(() => import('./pages/merchant/settings/ContactPage'));
const MerchantPrivacyPolicyPage = React.lazy(() => import('./pages/merchant/settings/PrivacyPolicyPage'));
const MerchantTermsConditionsPage = React.lazy(() => import('./pages/merchant/settings/TermsConditionsPage'));
const MerchantDeleteAccountPage = React.lazy(() => import('./pages/merchant/settings/DeleteAccountPage'));

// Guest pages
const GuestInfoPage = React.lazy(() => import('./pages/guest/GuestInfoPage'));
const GuestShopDetailsPage = React.lazy(() => import('./pages/guest/GuestShopDetailsPage'));
const GuestServiceSelectionPage = React.lazy(() => import('./pages/guest/GuestServiceSelectionPage'));
const GuestStaffSelectionPage = React.lazy(() => import('./pages/guest/GuestStaffSelectionPage'));
const GuestDatetimePage = React.lazy(() => import('./pages/guest/GuestDatetimePage'));
const GuestPaymentPage = React.lazy(() => import('./pages/guest/GuestPaymentPage'));
const GuestBookingSuccessPage = React.lazy(() => import('./pages/guest/GuestBookingSuccessPage'));
const GuestBookingHistoryPage = React.lazy(() => import('./pages/guest/GuestBookingHistoryPage'));
const GuestBookingCancellationPage = React.lazy(() => import('./pages/guest/GuestBookingCancellationPage'));
const GuestBookingPage = React.lazy(() => import('./pages/guest/GuestBookingPage'));

// Static pages
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = React.lazy(() => import('./pages/TermsAndConditions'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LazyRoute component={Index} />} />
            <Route path="/auth" element={<LazyRoute component={AuthPage} />} />
            <Route path="/forgot-password" element={<LazyRoute component={ForgotPasswordPage} />} />
            <Route path="/reset-password" element={<LazyRoute component={ResetPasswordPage} />} />
            <Route path="/verify" element={<LazyRoute component={VerifyPage} />} />
            
            {/* Static pages */}
            <Route path="/privacy-policy" element={<LazyRoute component={PrivacyPolicy} />} />
            <Route path="/terms-and-conditions" element={<LazyRoute component={TermsAndConditions} />} />
            
            {/* Shop slug resolver - MUST come before other routes to catch shop slugs */}
            <Route 
              path="/:shopSlug" 
              element={
                <ShopResolver>
                  <div />
                </ShopResolver>
              } 
            />
            
            {/* Customer routes */}
            <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="home" element={<LazyRoute component={HomePage} />} />
              <Route path="merchant/:merchantId" element={<LazyRoute component={MerchantDetailPage} />} />
              <Route path="booking/:merchantId/services" element={<LazyRoute component={ServiceSelectionPage} />} />
              <Route path="booking/:merchantId/staff" element={<LazyRoute component={StaffSelectionPage} />} />
              <Route path="booking/:merchantId/datetime" element={<LazyRoute component={DateTimeSelectionPage} />} />
              <Route path="booking/:merchantId/summary" element={<LazyRoute component={BookingSummaryPage} />} />
              <Route path="booking/:merchantId/payment" element={<LazyRoute component={PaymentPage} />} />
              <Route path="booking/:merchantId/receipt" element={<LazyRoute component={ReceiptPage} />} />
              <Route path="bookings" element={<LazyRoute component={BookingsHistoryPage} />} />
              <Route path="profile" element={<LazyRoute component={ProfilePage} />} />
              <Route path="settings" element={<LazyRoute component={SettingsPage} />} />
              <Route path="search" element={<LazyRoute component={SearchPage} />} />
              <Route path="map" element={<LazyRoute component={MapPage} />} />
              <Route path="nearby" element={<LazyRoute component={NearbyShopsPage} />} />
              <Route path="reviews/:merchantId" element={<LazyRoute component={ReviewsPage} />} />
              <Route path="calendar" element={<LazyRoute component={CalendarPage} />} />
              <Route path="account" element={<LazyRoute component={AccountPage} />} />
            </Route>
            
            {/* Settings routes */}
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="account" element={<LazyRoute component={AccountInformationPage} />} />
              <Route path="notifications" element={<LazyRoute component={NotificationsPage} />} />
              <Route path="about" element={<LazyRoute component={AboutPage} />} />
              <Route path="contact" element={<LazyRoute component={ContactPage} />} />
              <Route path="privacy" element={<LazyRoute component={PrivacyPolicyPage} />} />
              <Route path="terms" element={<LazyRoute component={TermsConditionsPage} />} />
              <Route path="delete-account" element={<LazyRoute component={DeleteAccountPage} />} />
            </Route>
            
            {/* Merchant routes */}
            <Route path="/merchant" element={<ProtectedRoute allowedRoles={['merchant']} />}>
              <Route path="dashboard" element={<LazyRoute component={MerchantDashboardPage} />} />
              <Route path="profile" element={<LazyRoute component={MerchantProfilePage} />} />
              <Route path="services" element={<LazyRoute component={MerchantServicesPage} />} />
              <Route path="calendar" element={<LazyRoute component={MerchantCalendarPage} />} />
              <Route path="earnings" element={<LazyRoute component={MerchantEarningsPage} />} />
              <Route path="analytics" element={<LazyRoute component={MerchantAnalyticsPage} />} />
              <Route path="settings" element={<LazyRoute component={MerchantSettingsPage} />} />
              <Route path="onboarding" element={<LazyRoute component={MerchantOnboardingPage} />} />
            </Route>
            
            {/* Merchant settings routes */}
            <Route path="/merchant/settings" element={<ProtectedRoute allowedRoles={['merchant']} />}>
              <Route path="business" element={<LazyRoute component={MerchantBusinessInformationPage} />} />
              <Route path="banking" element={<LazyRoute component={MerchantBankingDetailsPage} />} />
              <Route path="about" element={<LazyRoute component={MerchantAboutPage} />} />
              <Route path="contact" element={<LazyRoute component={MerchantContactPage} />} />
              <Route path="privacy" element={<LazyRoute component={MerchantPrivacyPolicyPage} />} />
              <Route path="terms" element={<LazyRoute component={MerchantTermsConditionsPage} />} />
              <Route path="delete-account" element={<LazyRoute component={MerchantDeleteAccountPage} />} />
            </Route>
            
            {/* Guest routes */}
            <Route path="/guest-info/:merchantId" element={<LazyRoute component={GuestInfoPage} />} />
            <Route path="/guest-shop/:merchantId" element={<LazyRoute component={GuestShopDetailsPage} />} />
            <Route path="/guest-services/:merchantId" element={<LazyRoute component={GuestServiceSelectionPage} />} />
            <Route path="/guest-staff/:merchantId" element={<LazyRoute component={GuestStaffSelectionPage} />} />
            <Route path="/guest-datetime/:merchantId" element={<LazyRoute component={GuestDatetimePage} />} />
            <Route path="/guest-payment/:merchantId" element={<LazyRoute component={GuestPaymentPage} />} />
            <Route path="/guest-success/:bookingId" element={<LazyRoute component={GuestBookingSuccessPage} />} />
            <Route path="/guest-history/:phone" element={<LazyRoute component={GuestBookingHistoryPage} />} />
            <Route path="/guest-cancel/:bookingId" element={<LazyRoute component={GuestBookingCancellationPage} />} />
            <Route path="/book/:merchantId" element={<LazyRoute component={GuestBookingPage} />} />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={<LazyRoute component={NotFound} />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
