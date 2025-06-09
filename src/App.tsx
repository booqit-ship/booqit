
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

// Merchant Pages
import MerchantLayout from '@/layouts/MerchantLayout';
import DashboardPage from '@/pages/merchant/DashboardPage';
import ServicesPage from '@/pages/merchant/ServicesPage';
import CalendarManagementPage from '@/pages/merchant/CalendarManagementPage';
import AnalyticsPage from '@/pages/merchant/AnalyticsPage';
import SettingsPage from '@/pages/merchant/SettingsPage';
import OnboardingPage from '@/pages/merchant/OnboardingPage';

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

// Component to handle session persistence and notifications - must be inside AuthProvider
const AppWithProviders = () => {
  useSessionPersistence();
  useNotifications(); // Now initializes Firebase notifications globally for all users
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
