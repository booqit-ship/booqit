
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/customer/BottomNavigation';

const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className={isMapPage ? "" : "pb-16"}>
        <Outlet />
      </main>
      {!isMapPage && <BottomNavigation />}
    </div>
  );
};

export default CustomerLayout;
