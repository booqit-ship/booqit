import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppInit from '@/components/AppInit';
import Index from '@/pages/Index';
import HomePage from '@/pages/customer/HomePage';
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
import ProfilePage from '@/pages/customer/ProfilePage';
import AccountPage from '@/pages/customer/AccountPage';
import ReviewsPage from '@/pages/customer/ReviewsPage';
import SettingsPage from '@/pages/customer/SettingsPage';
import BookingsHistoryPage from '@/pages/customer/BookingsHistoryPage';
import Auth from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyPage from '@/pages/VerifyPage';
import CustomerLayout from '@/layouts/CustomerLayout';
import MerchantDashboard from '@/pages/merchant/DashboardPage';
import MerchantServices from '@/pages/merchant/ServicesPage';
import MerchantCalendar from '@/pages/merchant/CalendarManagementPage';
import MerchantProfile from '@/pages/merchant/ProfilePage';
import MerchantLayout from '@/layouts/MerchantLayout';
import AnalyticsPage from '@/pages/merchant/AnalyticsPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import MerchantSettingsPage from '@/pages/merchant/SettingsPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import DeleteAccountPage from '@/pages/settings/DeleteAccountPage';
import ContactPage from '@/pages/settings/ContactPage';
import AboutPage from '@/pages/settings/AboutPage';
import MerchantBusinessInfoPage from '@/pages/merchant/settings/BusinessInformationPage';
import MerchantBankingDetailsPage from '@/pages/merchant/settings/BankingDetailsPage';
import MerchantContactPage from '@/pages/merchant/settings/ContactPage';
import MerchantAboutPage from '@/pages/merchant/settings/AboutPage';
import MerchantPrivacyPolicyPage from '@/pages/merchant/settings/PrivacyPolicyPage';
import MerchantTermsConditionsPage from '@/pages/merchant/settings/TermsConditionsPage';
import MerchantDeleteAccountPage from '@/pages/merchant/settings/DeleteAccountPage';
import NotificationsPage from '@/pages/settings/NotificationsPage';

const AppContent: React.FC = () => {
  const { user } = useAuth();
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
    <Router>
      <AppInit />
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />

        {/* Merchant Routes - using Auth for now since MerchantAuth doesn't exist */}
        <Route path="/merchant/auth" element={<Auth />} />
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

        {/* Booking Flow Routes */}
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
      </Routes>
    </Router>
  );
};

export default AppContent;
