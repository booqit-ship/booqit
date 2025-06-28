
import React, { useEffect, useState } from 'react';
import {
  Route,
  Routes,
} from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';
import LazyRoute from '@/components/LazyRoute';
import AppInit from '@/components/AppInit';
import ShopResolver from '@/components/ShopResolver';

// Lazy load all components using LazyRoute
const Index = LazyRoute(() => import('@/pages/Index'));
const HomePage = LazyRoute(() => import('@/pages/customer/HomePage'));
const SearchPage = LazyRoute(() => import('@/pages/customer/SearchPage'));
const MapPage = LazyRoute(() => import('@/pages/customer/MapPage'));
const MerchantDetailPage = LazyRoute(() => import('@/pages/customer/MerchantDetailPage'));
const ServiceSelectionPage = LazyRoute(() => import('@/pages/customer/ServiceSelectionPage'));
const StaffSelectionPage = LazyRoute(() => import('@/pages/customer/StaffSelectionPage'));
const DateTimeSelectionPage = LazyRoute(() => import('@/pages/customer/DateTimeSelectionPage'));
const BookingSummaryPage = LazyRoute(() => import('@/pages/customer/BookingSummaryPage'));
const PaymentPage = LazyRoute(() => import('@/pages/customer/PaymentPage'));
const ReceiptPage = LazyRoute(() => import('@/pages/customer/ReceiptPage'));
const CalendarPage = LazyRoute(() => import('@/pages/customer/CalendarPage'));
const ProfilePage = LazyRoute(() => import('@/pages/customer/ProfilePage'));
const AccountPage = LazyRoute(() => import('@/pages/customer/AccountPage'));
const ReviewsPage = LazyRoute(() => import('@/pages/customer/ReviewsPage'));
const SettingsPage = LazyRoute(() => import('@/pages/customer/SettingsPage'));
const BookingsHistoryPage = LazyRoute(() => import('@/pages/customer/BookingsHistoryPage'));
const Auth = LazyRoute(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = LazyRoute(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = LazyRoute(() => import('@/pages/ResetPasswordPage'));
const VerifyPage = LazyRoute(() => import('@/pages/VerifyPage'));
const CustomerLayout = LazyRoute(() => import('@/layouts/CustomerLayout'));
const MerchantDashboard = LazyRoute(() => import('@/pages/merchant/DashboardPage'));
const MerchantServices = LazyRoute(() => import('@/pages/merchant/ServicesPage'));
const MerchantCalendar = LazyRoute(() => import('@/pages/merchant/CalendarManagementPage'));
const MerchantProfile = LazyRoute(() => import('@/pages/merchant/ProfilePage'));
const MerchantLayout = LazyRoute(() => import('@/layouts/MerchantLayout'));
const AnalyticsPage = LazyRoute(() => import('@/pages/merchant/AnalyticsPage'));
const ProtectedRoute = LazyRoute(() => import('@/components/ProtectedRoute'));
const MerchantSettingsPage = LazyRoute(() => import('@/pages/merchant/SettingsPage'));
const OnboardingPage = LazyRoute(() => import('@/pages/merchant/OnboardingPage'));
const PrivacyPolicy = LazyRoute(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = LazyRoute(() => import('@/pages/TermsAndConditions'));
const DeleteAccountPage = LazyRoute(() => import('@/pages/settings/DeleteAccountPage'));
const ContactPage = LazyRoute(() => import('@/pages/settings/ContactPage'));
const AboutPage = LazyRoute(() => import('@/pages/settings/AboutPage'));
const MerchantBusinessInfoPage = LazyRoute(() => import('@/pages/merchant/settings/BusinessInformationPage'));
const MerchantBankingDetailsPage = LazyRoute(() => import('@/pages/merchant/settings/BankingDetailsPage'));
const MerchantContactPage = LazyRoute(() => import('@/pages/merchant/settings/ContactPage'));
const MerchantAboutPage = LazyRoute(() => import('@/pages/merchant/settings/AboutPage'));
const MerchantPrivacyPolicyPage = LazyRoute(() => import('@/pages/merchant/settings/PrivacyPolicyPage'));
const MerchantTermsConditionsPage = LazyRoute(() => import('@/pages/merchant/settings/TermsConditionsPage'));
const MerchantDeleteAccountPage = LazyRoute(() => import('@/pages/merchant/settings/DeleteAccountPage'));
const NotificationsPage = LazyRoute(() => import('@/pages/settings/NotificationsPage'));
const GuestInfoPage = LazyRoute(() => import('@/pages/guest/GuestInfoPage'));
const GuestShopDetailsPage = LazyRoute(() => import('@/pages/guest/GuestShopDetailsPage'));
const GuestServiceSelectionPage = LazyRoute(() => import('@/pages/guest/GuestServiceSelectionPage'));
const GuestStaffSelectionPage = LazyRoute(() => import('@/pages/guest/GuestStaffSelectionPage'));
const GuestDatetimePage = LazyRoute(() => import('@/pages/guest/GuestDatetimePage'));
const GuestPaymentPage = LazyRoute(() => import('@/pages/guest/GuestPaymentPage'));
const GuestBookingSuccessPage = LazyRoute(() => import('@/pages/guest/GuestBookingSuccessPage'));
const GuestBookingCancellationPage = LazyRoute(() => import('@/pages/guest/GuestBookingCancellationPage'));
const GuestBookingHistoryPage = LazyRoute(() => import('@/pages/guest/GuestBookingHistoryPage'));
const NotFound = LazyRoute(() => import('@/pages/NotFound'));

const AppContent: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Session loaded:", !!session);
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth State Change:", event);
      setLoading(false);
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppInit />
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />

        {/* Guest Booking Routes - Complete Flow */}
        <Route path="/book/:merchantId/:shopName" element={<GuestInfoPage />} />
        <Route path="/book/:merchantId" element={<GuestInfoPage />} />
        <Route path="/guest-info/:merchantId" element={<GuestInfoPage />} />
        <Route path="/guest-shop/:merchantId" element={<GuestShopDetailsPage />} />
        <Route path="/guest-services/:merchantId" element={<GuestServiceSelectionPage />} />
        <Route path="/guest-staff/:merchantId" element={<GuestStaffSelectionPage />} />
        <Route path="/guest-datetime/:merchantId" element={<GuestDatetimePage />} />
        <Route path="/guest-payment/:merchantId" element={<GuestPaymentPage />} />
        <Route path="/guest-booking-success/:merchantId" element={<GuestBookingSuccessPage />} />
        
        {/* Guest Booking Management Routes */}
        <Route path="/guest-cancel-booking" element={<GuestBookingCancellationPage />} />
        <Route path="/guest-booking-history" element={<GuestBookingHistoryPage />} />

        {/* Merchant Routes */}
        <Route path="/merchant/auth" element={<Auth />} />
        <Route path="/merchant/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantDashboard /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/dashboard" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantDashboard /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/services" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantServices /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/calendar" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantCalendar /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/profile" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantProfile /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/analytics" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><AnalyticsPage /></MerchantLayout></ProtectedRoute>} />
        <Route path="/merchant/settings" element={<ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantSettingsPage /></MerchantLayout></ProtectedRoute>} />

        {/* Merchant Settings Sub-Pages */}
        <Route
          path="/merchant/settings/business-information"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantBusinessInfoPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/banking-details"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantBankingDetailsPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/notifications"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <NotificationsPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/contact"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantContactPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/about"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantAboutPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/privacy-policy"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantPrivacyPolicyPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/terms-conditions"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantTermsConditionsPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/settings/delete-account"
          element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantLayout>
                <MerchantDeleteAccountPage />
              </MerchantLayout>
            </ProtectedRoute>
          }
        />

        {/* Customer Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<ProtectedRoute><CustomerLayout><HomePage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><CustomerLayout><SearchPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><CustomerLayout><MapPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/merchant/:merchantId" element={<ProtectedRoute><CustomerLayout><MerchantDetailPage /></CustomerLayout></ProtectedRoute>} />

        <Route path="/booking/:merchantId/services" element={<ProtectedRoute><CustomerLayout><ServiceSelectionPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/booking/:merchantId/staff" element={<ProtectedRoute><CustomerLayout><StaffSelectionPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/booking/:merchantId/datetime" element={<ProtectedRoute><CustomerLayout><DateTimeSelectionPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/booking-summary" element={<ProtectedRoute><CustomerLayout><BookingSummaryPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/payment/:merchantId" element={<ProtectedRoute><CustomerLayout><PaymentPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/receipt/:bookingId" element={<ProtectedRoute><CustomerLayout><ReceiptPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CustomerLayout><CalendarPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/bookings-history" element={<ProtectedRoute><CustomerLayout><BookingsHistoryPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><CustomerLayout><ProfilePage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><CustomerLayout><AccountPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><CustomerLayout><ReviewsPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><CustomerLayout><SettingsPage /></CustomerLayout></ProtectedRoute>} />

        <Route path="/settings/account" element={<ProtectedRoute><CustomerLayout><AccountPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings/privacy-policy" element={<ProtectedRoute><CustomerLayout><PrivacyPolicy /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings/terms-conditions" element={<ProtectedRoute><CustomerLayout><TermsAndConditions /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings/contact" element={<ProtectedRoute><CustomerLayout><ContactPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings/about" element={<ProtectedRoute><CustomerLayout><AboutPage /></CustomerLayout></ProtectedRoute>} />
        <Route path="/settings/delete-account" element={<ProtectedRoute><CustomerLayout><DeleteAccountPage /></CustomerLayout></ProtectedRoute>} />
        
        {/* Custom Shop URL Route - Must be last to avoid conflicts */}
        <Route 
          path="/:shopSlug" 
          element={
            <ShopResolver>
              <div />
            </ShopResolver>
          } 
        />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default AppContent;
