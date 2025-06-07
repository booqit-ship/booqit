
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrefetchMerchantData } from '@/hooks/useMerchantData';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  Settings,
  Briefcase,
  BarChart3
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prefetchData?: boolean;
}

const OptimizedNavigation: React.FC = () => {
  const location = useLocation();
  const { userId } = useAuth();
  const prefetchMerchant = usePrefetchMerchantData();

  const navItems: NavItem[] = [
    {
      path: '/merchant/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      prefetchData: true,
    },
    {
      path: '/merchant/calendar',
      label: 'Calendar',
      icon: Calendar,
      prefetchData: true,
    },
    {
      path: '/merchant/services',
      label: 'Services',
      icon: Briefcase,
      prefetchData: true,
    },
    {
      path: '/merchant/earnings',
      label: 'Earnings',
      icon: CreditCard,
      prefetchData: true,
    },
    {
      path: '/merchant/analytics',
      label: 'Analytics',
      icon: BarChart3,
      prefetchData: true,
    },
    {
      path: '/merchant/settings',
      label: 'Settings',
      icon: Settings,
      prefetchData: true,
    },
  ];

  const handleMouseEnter = (item: NavItem) => {
    if (item.prefetchData && userId) {
      prefetchMerchant(userId);
    }
  };

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onMouseEnter={() => handleMouseEnter(item)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              isActive
                ? "bg-booqit-primary text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default OptimizedNavigation;
