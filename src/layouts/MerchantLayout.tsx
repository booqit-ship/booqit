import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import SideNavigation from '@/components/merchant/SideNavigation';
import OptimizedNavigation from '@/components/merchant/OptimizedNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import MerchantNotificationBanner from '@/components/MerchantNotificationBanner';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { userId, userRole, isAuthenticated } = useAuth();
  const { hasPermission, isInitialized, requestPermissionManually } = useNotifications();
  const isMobile = useIsMobile();

  // Auto-prompt for notification permissions when merchant layout loads
  useEffect(() => {
    const initializeNotifications = async () => {
      if (isAuthenticated && userRole === 'merchant' && !hasPermission && !isInitialized) {
        console.log('🔔 MERCHANT LAYOUT: Checking notification permissions');
        
        // Check if user has previously denied notifications
        if (Notification.permission === 'default') {
          // Show a one-time prompt for enabling notifications
          const shouldEnable = window.confirm(
            'Enable booking notifications?\n\nYou\'ll get instant alerts when customers book appointments with you.'
          );
          
          if (shouldEnable) {
            await requestPermissionManually();
          }
        }
      }
    };

    // Delay to ensure auth is fully loaded
    const timer = setTimeout(initializeNotifications, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, userRole, hasPermission, isInitialized, requestPermissionManually]);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white min-h-screen">
          <MerchantNotificationBanner />
          <main className="pb-20">
            {children}
          </main>
          <OptimizedNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SideNavigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <MerchantNotificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
