
import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from '@/components/customer/BottomNavigation';

const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};

export default CustomerLayout;
