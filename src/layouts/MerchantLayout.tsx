
import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNavigation from '@/components/merchant/SideNavigation';

const MerchantLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SideNavigation />
      <div className="md:ml-20 min-h-screen">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
