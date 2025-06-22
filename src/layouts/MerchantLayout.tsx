
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavigation from '@/components/merchant/SideNavigation';
import OptimizedNavigation from '@/components/merchant/OptimizedNavigation';

interface MerchantLayoutProps {
  children?: React.ReactNode;
}

const MerchantLayout: React.FC<MerchantLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Don't show navigation on onboarding page
  if (location.pathname === '/merchant/onboarding') {
    return children ? <>{children}</> : <Outlet />;
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <SideNavigation />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children ? children : <Outlet />}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <OptimizedNavigation />
      </div>
    </div>
  );
};

export default MerchantLayout;
