import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import NotificationTestPage from '@/pages/NotificationTestPage';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useNotifications } from '@/hooks/useNotifications';
import { useCapacitor } from '@/hooks/useCapacitor';

// Customer Pages
import CustomerLayout from '@/layouts/CustomerLayout';
import HomePage from '@/pages/customer/HomePage';
import SearchPage from '@/pages/customer/SearchPage';
import MapPage from '@/pages/customer/MapPage';
import CalendarPage from '@/pages/customer/CalendarPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import MerchantDetailPage from '@/pages/customer/MerchantDetailPage';
import ServiceSelectionPage from '@/pages/customer/ServiceSelectionPage';
import StaffSelectionPage from '@/pages/customer/StaffSelectionPage';
import DateTimeSelectionPage from '@/pages/customer/DateTimeSelectionPage';
import BookingSummaryPage from '@/pages/customer/BookingSummaryPage';
import PaymentPage from '@/pages/customer/PaymentPage';
import ReceiptPage from '@/pages/customer/ReceiptPage';

// Customer Settings Pages
import CustomerSettingsPage from '@/pages/customer/SettingsPage';
import ContactPage from '@/pages/settings/ContactPage';
import AboutPage from '@/pages/settings/AboutPage';
import PrivacyPolicyPage from '@/pages/settings/PrivacyPolicyPage';
import TermsConditionsPage from '@/pages/settings/TermsConditionsPage';
import DeleteAccountPage from '@/pages/settings/DeleteAccountPage';
import ReviewsPage from '@/pages/customer/ReviewsPage';
import AccountPage from '@/pages/customer/AccountPage';

// Merchant Pages
import MerchantLayout from '@/layouts/MerchantLayout';
import DashboardPage from '@/pages/merchant/DashboardPage';
import ServicesPage from '@/pages/merchant/ServicesPage';
import CalendarManagementPage from '@/pages/merchant/CalendarManagementPage';
import AnalyticsPage from '@/pages/merchant/AnalyticsPage';
import SettingsPage from '@/pages/merchant/SettingsPage';
import OnboardingPage from '@/pages/merchant/OnboardingPage';

// Merchant Settings Pages
import MerchantContactPage from '@/pages/merchant/settings/ContactPage';
import MerchantAboutPage from '@/pages/merchant/settings/AboutPage';
import MerchantPrivacyPolicyPage from '@/pages/merchant/settings/PrivacyPolicyPage';
import MerchantTermsConditionsPage from '@/pages/merchant/settings/TermsConditionsPage';
import MerchantDeleteAccountPage from '@/pages/merchant/settings/DeleteAccountPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle session persistence, notifications, and Capacitor initialization
const AppWithProviders = () => {
  useSessionPersistence();
  useNotifications();
  useCapacitor(); // Initialize Capacitor for native features
  return null;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/terms-and-conditions",
    element: <TermsAndConditions />,
  },
  {
    path: "/test-notifications",
    element: <NotificationTestPage />,
  },
  // Customer routes - direct paths
  {
    path: "/home",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/home",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <HomePage /> },
        ],
      },
    ],
  },
  {
    path: "/search",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/search",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <SearchPage /> },
        ],
      },
    ],
  },
  {
    path: "/map",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/map",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <MapPage /> },
        ],
      },
    ],
  },
  {
    path: "/calendar",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/calendar",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <CalendarPage /> },
        ],
      },
    ],
  },
  {
    path: "/profile",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/profile",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant/:merchantId",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/merchant/:merchantId",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <MerchantDetailPage /> },
        ],
      },
    ],
  },
  {
    path: "/booking/:merchantId",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/booking/:merchantId",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <ServiceSelectionPage /> },
        ],
      },
    ],
  },
  {
    path: "/booking/:merchantId/staff",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/booking/:merchantId/staff",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <StaffSelectionPage /> },
        ],
      },
    ],
  },
  {
    path: "/booking/:merchantId/datetime",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/booking/:merchantId/datetime",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <DateTimeSelectionPage /> },
        ],
      },
    ],
  },
  {
    path: "/booking/:merchantId/summary",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/booking/:merchantId/summary",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <BookingSummaryPage /> },
        ],
      },
    ],
  },
  {
    path: "/payment/:merchantId",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/payment/:merchantId",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <PaymentPage /> },
        ],
      },
    ],
  },
  {
    path: "/receipt/:bookingId",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/receipt/:bookingId",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <ReceiptPage /> },
        ],
      },
    ],
  },
  // Customer Settings routes
  {
    path: "/settings",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <CustomerSettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/contact",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/contact",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <ContactPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/about",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/about",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <AboutPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/privacy-policy",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/privacy-policy",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <PrivacyPolicyPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/terms-conditions",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/terms-conditions",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <TermsConditionsPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/delete-account",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/delete-account",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <DeleteAccountPage /> },
        ],
      },
    ],
  },
  {
    path: "/reviews",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/reviews",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <ReviewsPage /> },
        ],
      },
    ],
  },
  {
    path: "/settings/account",
    element: <ProtectedRoute requiredRole="customer" />,
    children: [
      {
        path: "/settings/account",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <AccountPage /> },
        ],
      },
    ],
  },
  // Merchant routes
  {
    path: "/merchant",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "services", element: <ServicesPage /> },
          { path: "calendar", element: <CalendarManagementPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      { path: "onboarding", element: <OnboardingPage /> },
    ],
  },
  // Merchant Settings routes
  {
    path: "/merchant/settings/contact",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant/settings/contact",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantContactPage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant/settings/about",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant/settings/about",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantAboutPage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant/settings/privacy-policy",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant/settings/privacy-policy",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantPrivacyPolicyPage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant/settings/terms-conditions",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant/settings/terms-conditions",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantTermsConditionsPage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant/settings/delete-account",
    element: <ProtectedRoute requiredRole="merchant" />,
    children: [
      {
        path: "/merchant/settings/delete-account",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <MerchantDeleteAccountPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppWithProviders />
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
