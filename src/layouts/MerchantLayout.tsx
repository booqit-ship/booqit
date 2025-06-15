
import React from 'react';
import SideNavigation from '@/components/merchant/SideNavigation';
import OptimizedNavigation from '@/components/merchant/OptimizedNavigation';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white min-h-screen">
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
          {children}
        </main>
      </div>
    </div>
  );
}
