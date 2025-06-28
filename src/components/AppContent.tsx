
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import SplashScreen from '@/components/SplashScreen';
import AppInit from '@/components/AppInit';
import ShopResolver from '@/components/ShopResolver';

// Lazy load components
const NearbyShopsPage = React.lazy(() => import('@/pages/customer/NearbyShopsPage'));
const HomePage = React.lazy(() => import('@/pages/customer/HomePage'));
const AuthPage = React.lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyPage = React.lazy(() => import('@/pages/VerifyPage'));
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = React.lazy(() => import('@/pages/TermsAndConditions'));
const SearchPage = React.lazy(() => import('@/pages/customer/SearchPage'));
const MapPage = React.lazy(() => import('@/pages/customer/MapPage'));
const BookingsHistoryPage = React.lazy(() => import('@/pages/customer/BookingsHistoryPage'));
const SettingsPage = React.lazy(() => import('@/pages/customer/SettingsPage'));
const ProfilePage = React.lazy(() => import('@/pages/customer/ProfilePage'));
const AccountPage = React.lazy(() => import('@/pages/customer/AccountPage'));
const ReviewsPage = React.lazy(() => import('@/pages/customer/ReviewsPage'));
const CalendarPage = React.lazy(() => import('@/pages/customer/CalendarPage'));
const MerchantDetailPage = React.lazy(() => import('@/pages/customer/MerchantDetailPage'));
const Index = React.lazy(() => import('@/pages/Index'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

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
                  <Route path="/nearby-shops" element={<NearbyShopsPage />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify" element={<VerifyPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/bookings" element={<BookingsHistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  
                  {/* Booking flow routes */}
                  <Route path="/merchant/:merchantId" element={<MerchantDetailPage />} />
                  
                  {/* Default route */}
                  <Route path="/" element={<Index />} />
                  
                  {/* Shop resolver for custom URLs - must be last before 404 */}
                  <Route path="/:shopSlug" element={<ShopResolver><div /></ShopResolver>} />
                  
                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
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
