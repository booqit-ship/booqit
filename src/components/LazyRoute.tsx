
import React, { Suspense, lazy } from 'react';
import SplashScreen from './SplashScreen';

// Customer Pages
const HomePage = lazy(() => import('@/pages/customer/HomePage'));
const NearbyShopsPage = lazy(() => import('@/pages/customer/NearbyShopsPage'));
const SearchPage = lazy(() => import('@/pages/customer/SearchPage'));
const MapPage = lazy(() => import('@/pages/customer/MapPage'));
const MerchantDetailPage = lazy(() => import('@/pages/customer/MerchantDetailPage'));
const ServiceSelectionPage = lazy(() => import('@/pages/customer/ServiceSelectionPage'));
const StaffSelectionPage = lazy(() => import('@/pages/customer/StaffSelectionPage'));
const DateTimeSelectionPage = lazy(() => import('@/pages/customer/DateTimeSelectionPage'));
const BookingSummaryPage = lazy(() => import('@/pages/customer/BookingSummaryPage'));
const PaymentPage = lazy(() => import('@/pages/customer/PaymentPage'));
const ReceiptPage = lazy(() => import('@/pages/customer/ReceiptPage'));
const BookingsHistoryPage = lazy(() => import('@/pages/customer/BookingsHistoryPage'));
const CalendarPage = lazy(() => import('@/pages/customer/CalendarPage'));
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'));
const AccountPage = lazy(() => import('@/pages/customer/AccountPage'));
const SettingsPage = lazy(() => import('@/pages/customer/SettingsPage'));
const ReviewsPage = lazy(() => import('@/pages/customer/ReviewsPage'));

// Settings Pages
const AccountInformationPage = lazy(() => import('@/pages/settings/AccountInformationPage'));
const NotificationsPage = lazy(() => import('@/pages/settings/NotificationsPage'));
const AboutPage = lazy(() => import('@/pages/settings/AboutPage'));
const ContactPage = lazy(() => import('@/pages/settings/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/settings/PrivacyPolicyPage'));
const TermsConditionsPage = lazy(() => import('@/pages/settings/TermsConditionsPage'));
const DeleteAccountPage = lazy(() => import('@/pages/settings/DeleteAccountPage'));

// Merchant Pages
const DashboardPage = lazy(() => import('@/pages/merchant/DashboardPage'));
const OnboardingPage = lazy(() => import('@/pages/merchant/OnboardingPage'));
const ServicesPage = lazy(() => import('@/pages/merchant/ServicesPage'));
const CalendarManagementPage = lazy(() => import('@/pages/merchant/CalendarManagementPage'));
const EarningsPage = lazy(() => import('@/pages/merchant/EarningsPage'));
const AnalyticsPage = lazy(() => import('@/pages/merchant/AnalyticsPage'));
const MerchantProfilePage = lazy(() => import('@/pages/merchant/ProfilePage'));
const MerchantSettingsPage = lazy(() => import('@/pages/merchant/SettingsPage'));

// Merchant Settings Pages
const BusinessInformationPage = lazy(() => import('@/pages/merchant/settings/BusinessInformationPage'));
const BankingDetailsPage = lazy(() => import('@/pages/merchant/settings/BankingDetailsPage'));
const MerchantAboutPage = lazy(() => import('@/pages/merchant/settings/AboutPage'));
const MerchantContactPage = lazy(() => import('@/pages/merchant/settings/ContactPage'));
const MerchantPrivacyPolicyPage = lazy(() => import('@/pages/merchant/settings/PrivacyPolicyPage'));
const MerchantTermsConditionsPage = lazy(() => import('@/pages/merchant/settings/TermsConditionsPage'));
const MerchantDeleteAccountPage = lazy(() => import('@/pages/merchant/settings/DeleteAccountPage'));

// Auth and Other Pages
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyPage = lazy(() => import('@/pages/VerifyPage'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const NotificationTestPage = lazy(() => import('@/pages/NotificationTestPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const componentMap = {
  // Customer Pages
  HomePage,
  NearbyShopsPage,
  SearchPage,
  MapPage,
  MerchantDetailPage,
  ServiceSelectionPage,
  StaffSelectionPage,
  DateTimeSelectionPage,
  BookingSummaryPage,
  PaymentPage,
  ReceiptPage,
  BookingsHistoryPage,
  CalendarPage,
  ProfilePage,
  AccountPage,
  SettingsPage,
  ReviewsPage,
  
  // Settings Pages
  AccountInformationPage,
  NotificationsPage,
  AboutPage,
  ContactPage,
  PrivacyPolicyPage,
  TermsConditionsPage,
  DeleteAccountPage,
  
  // Merchant Pages
  DashboardPage,
  OnboardingPage,
  ServicesPage,
  CalendarManagementPage,
  EarningsPage,
  AnalyticsPage,
  MerchantProfilePage,
  MerchantSettingsPage,
  
  // Merchant Settings Pages
  BusinessInformationPage,
  BankingDetailsPage,
  MerchantAboutPage,
  MerchantContactPage,
  MerchantPrivacyPolicyPage,
  MerchantTermsConditionsPage,
  MerchantDeleteAccountPage,
  
  // Auth and Other Pages
  AuthPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyPage,
  PrivacyPolicy,
  TermsAndConditions,
  NotificationTestPage,
  NotFound,
};

interface LazyRouteProps {
  component: keyof typeof componentMap;
}

const LazyRoute: React.FC<LazyRouteProps> = ({ component }) => {
  const Component = componentMap[component];
  
  if (!Component) {
    console.error(`Component ${component} not found in componentMap`);
    return <div>Component not found</div>;
  }

  return (
    <Suspense fallback={<SplashScreen />}>
      <Component />
    </Suspense>
  );
};

export default LazyRoute;
