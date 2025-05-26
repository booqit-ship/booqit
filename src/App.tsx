
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import SplashScreen from '@/components/SplashScreen';
import AuthPage from '@/pages/AuthPage';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';

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
import BookingPage from '@/pages/customer/BookingPage';
import BookingSummaryPage from '@/pages/customer/BookingSummaryPage';
import PaymentPage from '@/pages/customer/PaymentPage';
import ReceiptPage from '@/pages/customer/ReceiptPage';

// Merchant Pages
import MerchantLayout from '@/layouts/MerchantLayout';
import DashboardPage from '@/pages/merchant/DashboardPage';
import ServicesPage from '@/pages/merchant/ServicesPage';
import CalendarManagementPage from '@/pages/merchant/CalendarManagementPage';
import CustomersPage from '@/pages/merchant/CustomersPage';
import SettingsPage from '@/pages/merchant/SettingsPage';
import OnboardingPage from '@/pages/merchant/OnboardingPage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/splash",
    element: <SplashScreen />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: <ProtectedRoute allowedRoles={['customer']} />,
    children: [
      {
        path: "/",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "search", element: <SearchPage /> },
          { path: "map", element: <MapPage /> },
          { path: "calendar", element: <CalendarPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "merchant/:merchantId", element: <MerchantDetailPage /> },
          { path: "booking/:merchantId", element: <ServiceSelectionPage /> },
          { path: "booking/:merchantId/staff", element: <StaffSelectionPage /> },
          { path: "booking/:merchantId/datetime", element: <BookingPage /> },
          { path: "booking/:merchantId/summary", element: <BookingSummaryPage /> },
          { path: "payment/:merchantId", element: <PaymentPage /> },
          { path: "receipt/:bookingId", element: <ReceiptPage /> },
        ],
      },
    ],
  },
  {
    path: "/merchant",
    element: <ProtectedRoute allowedRoles={['merchant']} />,
    children: [
      {
        path: "/merchant",
        element: <MerchantLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "services", element: <ServicesPage /> },
          { path: "calendar", element: <CalendarManagementPage /> },
          { path: "customers", element: <CustomersPage /> },
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
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
