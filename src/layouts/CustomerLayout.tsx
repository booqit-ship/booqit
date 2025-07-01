
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/customer/BottomNavigation';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const layoutConfig = useMemo(() => {
    const pathname = location.pathname;
    const isMapPage = pathname === '/map';
    const isSearchPage = pathname === '/search';
    const isCalendarPage = pathname === '/calendar';
    const isBookingFlow = pathname.includes('/booking/') || 
                         pathname.includes('/payment/') ||
                         pathname.includes('/receipt/');
    const isSettingsPage = pathname.startsWith('/settings/');
    
    return {
      showBottomNav: !isMapPage && !isBookingFlow && !isSettingsPage,
      needsPadding: !isMapPage && !isSearchPage && !isBookingFlow && !isCalendarPage && !isSettingsPage
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={layoutConfig.needsPadding ? "pb-20" : ""}>
        {children}
      </main>
      {layoutConfig.showBottomNav && <BottomNavigation />}
    </div>
  );
};

export default React.memo(CustomerLayout);
