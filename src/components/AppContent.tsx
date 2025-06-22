
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';
import LazyRoute from '@/components/LazyRoute';
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
import OnboardingPage from '@/pages/merchant/OnboardingPage';
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
      <Router>
        <AppInit />
        <Routes>
          {/* Auth Routes */}
          <Route path="/auth" element={<LazyRoute><Auth /></LazyRoute>} />
          <Route path="/forgot-password" element={<LazyRoute><ForgotPasswordPage /></LazyRoute>} />
          <Route path="/reset-password" element={<LazyRoute><ResetPasswordPage /></LazyRoute>} />
          <Route path="/verify" element={<LazyRoute><VerifyPage /></LazyRoute>} />

          {/* Merchant Routes */}
          <Route path="/merchant/auth" element={<LazyRoute><Auth /></LazyRoute>} />
          <Route path="/merchant/onboarding" element={<LazyRoute><ProtectedRoute><OnboardingPage /></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantDashboard /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/dashboard" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantDashboard /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/services" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantServices /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/calendar" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantCalendar /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/profile" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantProfile /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/analytics" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><AnalyticsPage /></MerchantLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/settings" element={<LazyRoute><ProtectedRoute requiredRole="merchant"><MerchantLayout><MerchantSettingsPage /></MerchantLayout></ProtectedRoute></LazyRoute>} />

          {/* Merchant Settings Sub-Pages */}
          <Route
            path="/merchant/settings/business-information"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantBusinessInfoPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/banking-details"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantBankingDetailsPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/notifications"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <NotificationsPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/contact"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantContactPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/about"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantAboutPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/privacy-policy"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantPrivacyPolicyPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/terms-conditions"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantTermsConditionsPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />
          <Route
            path="/merchant/settings/delete-account"
            element={
              <LazyRoute>
                <ProtectedRoute requiredRole="merchant">
                  <MerchantLayout>
                    <MerchantDeleteAccountPage />
                  </MerchantLayout>
                </ProtectedRoute>
              </LazyRoute>
            }
          />

          {/* Customer Routes */}
          <Route path="/" element={<LazyRoute><Index /></LazyRoute>} />
          <Route path="/home" element={<LazyRoute><ProtectedRoute><CustomerLayout><HomePage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/search" element={<LazyRoute><ProtectedRoute><CustomerLayout><SearchPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/map" element={<LazyRoute><ProtectedRoute><CustomerLayout><MapPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/merchant/:merchantId" element={<LazyRoute><ProtectedRoute><CustomerLayout><MerchantDetailPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />

          <Route path="/booking/:merchantId/services" element={<LazyRoute><ProtectedRoute><CustomerLayout><ServiceSelectionPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/booking/:merchantId/staff" element={<LazyRoute><ProtectedRoute><CustomerLayout><StaffSelectionPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/booking/:merchantId/datetime" element={<LazyRoute><ProtectedRoute><CustomerLayout><DateTimeSelectionPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/booking-summary" element={<LazyRoute><ProtectedRoute><CustomerLayout><BookingSummaryPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/payment/:merchantId" element={<LazyRoute><ProtectedRoute><CustomerLayout><PaymentPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/receipt/:bookingId" element={<LazyRoute><ProtectedRoute><CustomerLayout><ReceiptPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/calendar" element={<LazyRoute><ProtectedRoute><CustomerLayout><CalendarPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/bookings-history" element={<LazyRoute><ProtectedRoute><CustomerLayout><BookingsHistoryPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/profile" element={<LazyRoute><ProtectedRoute><CustomerLayout><ProfilePage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/account" element={<LazyRoute><ProtectedRoute><CustomerLayout><AccountPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/reviews" element={<LazyRoute><ProtectedRoute><CustomerLayout><ReviewsPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings" element={<LazyRoute><ProtectedRoute><CustomerLayout><SettingsPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />

          <Route path="/settings/account" element={<LazyRoute><ProtectedRoute><CustomerLayout><AccountPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings/privacy-policy" element={<LazyRoute><ProtectedRoute><CustomerLayout><PrivacyPolicy /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings/terms-conditions" element={<LazyRoute><ProtectedRoute><CustomerLayout><TermsAndConditions /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings/contact" element={<LazyRoute><ProtectedRoute><CustomerLayout><ContactPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings/about" element={<LazyRoute><ProtectedRoute><CustomerLayout><AboutPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
          <Route path="/settings/delete-account" element={<LazyRoute><ProtectedRoute><CustomerLayout><DeleteAccountPage /></CustomerLayout></ProtectedRoute></LazyRoute>} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default AppContent;
