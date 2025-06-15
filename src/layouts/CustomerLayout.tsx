
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className={(isMapPage || isSearchPage || isBookingFlow || isCalendarPage) ? "" : "pb-20"}>
        {children}
      </main>
      {!isMapPage && !isBookingFlow && <BottomNavigation />}
    </div>
  );
};

export default CustomerLayout;
