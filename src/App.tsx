import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import CustomerLayout from '@/layouts/CustomerLayout';
import MerchantLayout from '@/layouts/MerchantLayout';
import LazyRoute from '@/components/LazyRoute';
import SplashScreen from '@/components/SplashScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppInit from '@/components/AppInit';

// Lazy-loaded components
// Customer Pages
// const HomePage = lazy(() => import('@/pages/customer/HomePage'));
// const SearchPage = lazy(() => import('@/pages/customer/SearchPage'));
// const MapPage = lazy(() => import('@/pages/customer/MapPage'));
// const MerchantDetailPage = lazy(() => import('@/pages/customer/MerchantDetailPage'));
// const ServiceSelectionPage = lazy(() => import('@/pages/customer/ServiceSelectionPage'));
// const StaffSelectionPage = lazy(() => import('@/pages/customer/StaffSelectionPage'));
// const DateTimeSelectionPage = lazy(() => import('@/pages/customer/DateTimeSelectionPage'));
// const BookingSummaryPage = lazy(() => import('@/pages/customer/BookingSummaryPage'));
// const PaymentPage = lazy(() => import('@/pages/customer/PaymentPage'));
// const ReceiptPage = lazy(() => import('@/pages/customer/ReceiptPage'));
// const BookingsHistoryPage = lazy(() => import('@/pages/customer/BookingsHistoryPage'));
// const CalendarPage = lazy(() => import('@/pages/customer/CalendarPage'));
// const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'));
// const AccountPage = lazy(() => import('@/pages/customer/AccountPage'));
// const SettingsPage = lazy(() => import('@/pages/customer/SettingsPage'));
// const ReviewsPage = lazy(() => import('@/pages/customer/ReviewsPage'));
// const NearbyShopsPage = lazy(() => import('@/pages/customer/NearbyShopsPage'));

// Settings Pages
// const AccountInformationPage = lazy(() => import('@/pages/settings/AccountInformationPage'));
// const NotificationsPage = lazy(() => import('@/pages/settings/NotificationsPage'));
// const AboutPage = lazy(() => import('@/pages/settings/AboutPage'));
// const ContactPage = lazy(() => import('@/pages/settings/ContactPage'));
// const PrivacyPolicyPage = lazy(() => import('@/pages/settings/PrivacyPolicyPage'));
// const TermsConditionsPage = lazy(() => import('@/pages/settings/TermsConditionsPage'));
// const DeleteAccountPage = lazy(() => import('@/pages/settings/DeleteAccountPage'));

// Merchant Pages
// const DashboardPage = lazy(() => import('@/pages/merchant/DashboardPage'));
// const OnboardingPage = lazy(() => import('@/pages/merchant/OnboardingPage'));
// const ServicesPage = lazy(() => import('@/pages/merchant/ServicesPage'));
// const CalendarManagementPage = lazy(() => import('@/pages/merchant/CalendarManagementPage'));
// const EarningsPage = lazy(() => import('@/pages/merchant/EarningsPage'));
// const AnalyticsPage = lazy(() => import('@/pages/merchant/AnalyticsPage'));
// const MerchantProfilePage = lazy(() => import('@/pages/merchant/ProfilePage'));
// const MerchantSettingsPage = lazy(() => import('@/pages/merchant/SettingsPage'));

// Merchant Settings Pages
// const BusinessInformationPage = lazy(() => import('@/pages/merchant/settings/BusinessInformationPage'));
// const BankingDetailsPage = lazy(() => import('@/pages/merchant/settings/BankingDetailsPage'));
// const MerchantAboutPage = lazy(() => import('@/pages/merchant/settings/AboutPage'));
// const MerchantContactPage = lazy(() => import('@/pages/merchant/settings/ContactPage'));
// const MerchantPrivacyPolicyPage = lazy(() => import('@/pages/merchant/settings/PrivacyPolicyPage'));
// const MerchantTermsConditionsPage = lazy(() => import('@/pages/merchant/settings/TermsConditionsPage'));
// const MerchantDeleteAccountPage = lazy(() => import('@/pages/merchant/settings/DeleteAccountPage'));

// Auth and Other Pages
// const AuthPage = lazy(() => import('@/pages/AuthPage'));
// const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
// const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
// const VerifyPage = lazy(() => import('@/pages/VerifyPage'));
// const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
// const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
// const NotificationTestPage = lazy(() => import('@/pages/NotificationTestPage'));
// const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <AppInit />
              <Routes>
                {/* Auth Routes */}
                <Route path="/auth" element={<LazyRoute component="AuthPage" />} />
                <Route path="/forgot-password" element={<LazyRoute component="ForgotPasswordPage" />} />
                <Route path="/reset-password" element={<LazyRoute component="ResetPasswordPage" />} />
                <Route path="/verify" element={<LazyRoute component="VerifyPage" />} />
                
                {/* Public Routes */}
                <Route path="/privacy-policy" element={<LazyRoute component="PrivacyPolicy" />} />
                <Route path="/terms-and-conditions" element={<LazyRoute component="TermsAndConditions" />} />
                
                {/* Customer Routes */}
                <Route path="/" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="HomePage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/nearby-shops" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="NearbyShopsPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/search" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="SearchPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/map" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="MapPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="MerchantDetailPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/booking/services/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="ServiceSelectionPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/booking/staff/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="StaffSelectionPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/booking/datetime/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="DateTimeSelectionPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/booking/summary/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="BookingSummaryPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/payment/:bookingId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="PaymentPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/receipt/:bookingId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="ReceiptPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/bookings" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="BookingsHistoryPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/calendar" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="CalendarPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="ProfilePage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/account" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="AccountPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/settings" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="SettingsPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/reviews/:merchantId" element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerLayout>
                      <LazyRoute component="ReviewsPage" />
                    </CustomerLayout>
                  </ProtectedRoute>
                } />
                
                {/* Settings Routes */}
                <Route path="/settings/account" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="AccountInformationPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/notifications" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="NotificationsPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/about" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="AboutPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/contact" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="ContactPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/privacy" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="PrivacyPolicyPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/terms" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="TermsConditionsPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/settings/delete-account" element={
                  <ProtectedRoute allowedRole="customer">
                    <LazyRoute component="DeleteAccountPage" />
                  </ProtectedRoute>
                } />
                
                {/* Merchant Routes */}
                <Route path="/merchant-dashboard" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="DashboardPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-onboarding" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="OnboardingPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-services" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="ServicesPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-calendar" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="CalendarManagementPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-earnings" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="EarningsPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-analytics" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="AnalyticsPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-profile" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="MerchantProfilePage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings" element={
                  <ProtectedRoute allowedRole="merchant">
                    <MerchantLayout>
                      <LazyRoute component="MerchantSettingsPage" />
                    </MerchantLayout>
                  </ProtectedRoute>
                } />
                
                {/* Merchant Settings Sub-routes */}
                <Route path="/merchant-settings/business" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="BusinessInformationPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/banking" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="BankingDetailsPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/about" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="MerchantAboutPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/contact" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="MerchantContactPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/privacy" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="MerchantPrivacyPolicyPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/terms" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="MerchantTermsConditionsPage" />
                  </ProtectedRoute>
                } />
                
                <Route path="/merchant-settings/delete-account" element={
                  <ProtectedRoute allowedRole="merchant">
                    <LazyRoute component="MerchantDeleteAccountPage" />
                  </ProtectedRoute>
                } />
                
                {/* Testing Routes */}
                <Route path="/notification-test" element={<LazyRoute component="NotificationTestPage" />} />
                
                {/* Fallback Routes */}
                <Route path="/not-found" element={<LazyRoute component="NotFound" />} />
                <Route path="*" element={<Navigate to="/not-found" replace />} />
              </Routes>
            </Router>
            <Toaster />
            <Sonner />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
