
import React from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/customer/BottomNavigation';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';
  const isSearchPage = location.pathname === '/search';
  const isCalendarPage = location.pathname === '/calendar';
  const isBookingFlow = location.pathname.includes('/booking/') || 
                         location.pathname.includes('/payment/') ||
                         location.pathname.includes('/receipt/');
  const isSettingsPage = location.pathname.startsWith('/settings/');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className={(isMapPage || isSearchPage || isBookingFlow || isCalendarPage || isSettingsPage) ? "" : "pb-20"}>
        {children}
      </main>
      {!isMapPage && !isBookingFlow && !isSettingsPage && <BottomNavigation />}
    </div>
  );
};

export default CustomerLayout;
