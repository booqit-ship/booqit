
import React from 'react';
import SideNavigation from '@/components/merchant/SideNavigation';

interface MerchantLayoutProps {
  children: React.ReactNode;
}

const MerchantLayout: React.FC<MerchantLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SideNavigation />
      <div className="md:ml-20 min-h-screen">
        <main className="pb-20 md:pb-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
