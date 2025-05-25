
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/customer/BottomNavigation';

const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';
  const isSearchPage = location.pathname === '/search';
  const isBookingFlow = location.pathname.includes('/booking/') || 
                         location.pathname.includes('/payment/') ||
                         location.pathname.includes('/receipt/');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className={(isMapPage || isSearchPage || isBookingFlow) ? "" : "pb-16"}>
        <Outlet />
      </main>
      {!isMapPage && !isSearchPage && !isBookingFlow && <BottomNavigation />}
    </div>
  );
};

export default CustomerLayout;
