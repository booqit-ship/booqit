import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import AppInit from '@/components/AppInit';
import LazyRoute from '@/components/LazyRoute';
import ProtectedRoute from '@/components/ProtectedRoute';
import ShopResolver from '@/components/ShopResolver';
import SplashScreen from '@/components/SplashScreen';

// Lazy load pages
const Index = React.lazy(() => import('@/pages/Index'));
const AuthPage = React.lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyPage = React.lazy(() => import('@/pages/VerifyPage'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

// Policy pages
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = React.lazy(() => import('@/pages/TermsAndConditions'));

// Customer pages
const CustomerLayout = React.lazy(() => import('@/layouts/CustomerLayout'));
const HomePage = React.lazy(() => import('@/pages/customer/HomePage'));
const MapPage = React.lazy(() => import('@/pages/customer/MapPage'));
const SearchPage = React.lazy(() => import('@/pages/customer/SearchPage'));
const NearbyShopsPage = React.lazy(() => import('@/pages/customer/NearbyShopsPage'));
const MerchantDetailPage = React.lazy(() => import('@/pages/customer/MerchantDetailPage'));
const ServiceSelectionPage = React.lazy(() => import('@/pages/customer/ServiceSelectionPage'));
const StaffSelectionPage = React.lazy(() => import('@/pages/customer/StaffSelectionPage'));
const DateTimeSelectionPage = React.lazy(() => import('@/pages/customer/DateTimeSelectionPage'));
const BookingSummaryPage = React.lazy(() => import('@/pages/customer/BookingSummaryPage'));
const PaymentPage = React.lazy(() => import('@/pages/customer/PaymentPage'));
const ReceiptPage = React.lazy(() => import('@/pages/customer/ReceiptPage'));
const CalendarPage = React.lazy(() => import('@/pages/customer/CalendarPage'));
const BookingsHistoryPage = React.lazy(() => import('@/pages/customer/BookingsHistoryPage'));
const ProfilePage = React.lazy(() => import('@/pages/customer/ProfilePage'));
const AccountPage = React.lazy(() => import('@/pages/customer/AccountPage'));
const SettingsPage = React.lazy(() => import('@/pages/customer/SettingsPage'));
const ReviewsPage = React.lazy(() => import('@/pages/customer/ReviewsPage'));

// Merchant pages
const MerchantLayout = React.lazy(() => import('@/layouts/MerchantLayout'));
const MerchantDashboardPage = React.lazy(() => import('@/pages/merchant/DashboardPage'));
const MerchantCalendarManagementPage = React.lazy(() => import('@/pages/merchant/CalendarManagementPage'));
const MerchantServicesPage = React.lazy(() => import('@/pages/merchant/ServicesPage'));
const MerchantProfilePage = React.lazy(() => import('@/pages/merchant/ProfilePage'));
const MerchantSettingsPage = React.lazy(() => import('@/pages/merchant/SettingsPage'));
const MerchantAnalyticsPage = React.lazy(() => import('@/pages/merchant/AnalyticsPage'));
const MerchantEarningsPage = React.lazy(() => import('@/pages/merchant/EarningsPage'));
const OnboardingPage = React.lazy(() => import('@/pages/merchant/OnboardingPage'));

// Merchant settings sub-pages
const BusinessInformationPage = React.lazy(() => import('@/pages/merchant/settings/BusinessInformationPage'));
const BankingDetailsPage = React.lazy(() => import('@/pages/merchant/settings/BankingDetailsPage'));
const MerchantContactPage = React.lazy(() => import('@/pages/merchant/settings/ContactPage'));
const MerchantAboutPage = React.lazy(() => import('@/pages/merchant/settings/AboutPage'));
const MerchantPrivacyPolicyPage = React.lazy(() => import('@/pages/merchant/settings/PrivacyPolicyPage'));
const MerchantTermsConditionsPage = React.lazy(() => import('@/pages/merchant/settings/TermsConditionsPage'));
const MerchantDeleteAccountPage = React.lazy(() => import('@/pages/merchant/settings/DeleteAccountPage'));

// Customer settings sub-pages
const AccountInformationPage = React.lazy(() => import('@/pages/settings/AccountInformationPage'));
const NotificationsPage = React.lazy(() => import('@/pages/settings/NotificationsPage'));
const CustomerContactPage = React.lazy(() => import('@/pages/settings/ContactPage'));
const CustomerAboutPage = React.lazy(() => import('@/pages/settings/AboutPage'));
const CustomerPrivacyPolicyPage = React.lazy(() => import('@/pages/settings/PrivacyPolicyPage'));
const CustomerTermsConditionsPage = React.lazy(() => import('@/pages/settings/TermsConditionsPage'));
const CustomerDeleteAccountPage = React.lazy(() => import('@/pages/settings/DeleteAccountPage'));

// Guest booking pages
const GuestInfoPage = React.lazy(() => import('@/pages/guest/GuestInfoPage'));
const GuestShopDetailsPage = React.lazy(() => import('@/pages/guest/GuestShopDetailsPage'));
const GuestServiceSelectionPage = React.lazy(() => import('@/pages/guest/GuestServiceSelectionPage'));
const GuestStaffSelectionPage = React.lazy(() => import('@/pages/guest/GuestStaffSelectionPage'));
const GuestDatetimePage = React.lazy(() => import('@/pages/guest/GuestDatetimePage'));
const GuestBookingPage = React.lazy(() => import('@/pages/guest/GuestBookingPage'));
const GuestPaymentPage = React.lazy(() => import('@/pages/guest/GuestPaymentPage'));
const GuestBookingSuccessPage = React.lazy(() => import('@/pages/guest/GuestBookingSuccessPage'));
const GuestBookingHistoryPage = React.lazy(() => import('@/pages/guest/GuestBookingHistoryPage'));
const GuestBookingCancellationPage = React.lazy(() => import('@/pages/guest/GuestBookingCancellationPage'));

// Test page
const NotificationTestPage = React.lazy(() => import('@/pages/NotificationTestPage'));

function App() {
  return (
    <AppInit>
      <div className="App">
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LazyRoute><Index /></LazyRoute>} />
            <Route path="/auth" element={<LazyRoute><AuthPage /></LazyRoute>} />
            <Route path="/forgot-password" element={<LazyRoute><ForgotPasswordPage /></LazyRoute>} />
            <Route path="/reset-password" element={<LazyRoute><ResetPasswordPage /></LazyRoute>} />
            <Route path="/verify" element={<LazyRoute><VerifyPage /></LazyRoute>} />
            
            {/* Policy pages - MUST come before shop resolver */}
            <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
            <Route path="/terms-and-conditions" element={<LazyRoute><TermsAndConditions /></LazyRoute>} />

            {/* Customer routes */}
            <Route path="/home" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <HomePage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/map" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <MapPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/search" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <SearchPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/nearby" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <NearbyShopsPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/:id" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <MerchantDetailPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/:id/services" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <ServiceSelectionPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/:id/staff" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <StaffSelectionPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/:id/datetime" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <DateTimeSelectionPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/booking-summary" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <BookingSummaryPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/payment" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <PaymentPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/receipt/:bookingId" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <ReceiptPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/calendar" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <CalendarPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/bookings" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <BookingsHistoryPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <ProfilePage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/account" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <AccountPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <SettingsPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/reviews/:merchantId" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute>
                  <CustomerLayout>
                    <ReviewsPage />
                  </CustomerLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />

            {/* Customer settings sub-routes */}
            <Route path="/settings/account" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><AccountInformationPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/notifications" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><NotificationsPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/contact" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><CustomerContactPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/about" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><CustomerAboutPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/privacy-policy" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><CustomerPrivacyPolicyPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/terms-conditions" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><CustomerTermsConditionsPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/settings/delete-account" element={
              <ProtectedRoute requiredRole="customer">
                <LazyRoute><CustomerDeleteAccountPage /></LazyRoute>
              </ProtectedRoute>
            } />

            {/* Merchant routes */}
            <Route path="/merchant" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantDashboardPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/onboarding" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><OnboardingPage /></LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/calendar" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantCalendarManagementPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/services" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantServicesPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/profile" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantProfilePage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/settings" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantSettingsPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/analytics" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantAnalyticsPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/merchant/earnings" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute>
                  <MerchantLayout>
                    <MerchantEarningsPage />
                  </MerchantLayout>
                </LazyRoute>
              </ProtectedRoute>
            } />

            {/* Merchant settings sub-routes */}
            <Route path="/merchant/settings/business" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><BusinessInformationPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/banking" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><BankingDetailsPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/contact" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><MerchantContactPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/about" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><MerchantAboutPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/privacy-policy" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><MerchantPrivacyPolicyPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/terms-conditions" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><MerchantTermsConditionsPage /></LazyRoute>
              </ProtectedRoute>
            } />
            <Route path="/merchant/settings/delete-account" element={
              <ProtectedRoute requiredRole="merchant">
                <LazyRoute><MerchantDeleteAccountPage /></LazyRoute>
              </ProtectedRoute>
            } />

            {/* Guest booking routes */}
            <Route path="/guest-info/:merchantId" element={<LazyRoute><GuestInfoPage /></LazyRoute>} />
            <Route path="/guest-shop/:merchantId" element={<LazyRoute><GuestShopDetailsPage /></LazyRoute>} />
            <Route path="/guest-services/:merchantId" element={<LazyRoute><GuestServiceSelectionPage /></LazyRoute>} />
            <Route path="/guest-staff/:merchantId" element={<LazyRoute><GuestStaffSelectionPage /></LazyRoute>} />
            <Route path="/guest-datetime/:merchantId" element={<LazyRoute><GuestDatetimePage /></LazyRoute>} />
            <Route path="/guest-booking/:merchantId" element={<LazyRoute><GuestBookingPage /></LazyRoute>} />
            <Route path="/guest-payment/:merchantId" element={<LazyRoute><GuestPaymentPage /></LazyRoute>} />
            <Route path="/guest-success/:bookingId" element={<LazyRoute><GuestBookingSuccessPage /></LazyRoute>} />
            <Route path="/guest-history/:phone" element={<LazyRoute><GuestBookingHistoryPage /></LazyRoute>} />
            <Route path="/guest-cancel/:bookingId" element={<LazyRoute><GuestBookingCancellationPage /></LazyRoute>} />

            {/* Test routes */}
            <Route path="/test-notifications" element={<LazyRoute><NotificationTestPage /></LazyRoute>} />

            {/* Shop resolver - MUST come after all specific routes */}
            <Route path="/:shopSlug" element={<LazyRoute><ShopResolver /></LazyRoute>} />

            {/* 404 page */}
            <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </AppInit>
  );
}

export default App;
