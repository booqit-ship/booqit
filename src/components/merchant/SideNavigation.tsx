
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  Settings,
  Briefcase,
  Menu,
  X,
  BarChart3
} from 'lucide-react';

const SideNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      path: '/merchant/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/merchant/calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      path: '/merchant/services',
      label: 'Services',
      icon: Briefcase,
    },
    {
      path: '/merchant/earnings',
      label: 'Earnings',
      icon: CreditCard,
    },
    {
      path: '/merchant/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      path: '/merchant/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow-lg border"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-transform duration-300",
          "w-64 md:w-20",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-booqit-primary md:hidden">BooqIt</h1>
            <div className="hidden md:block w-8 h-8 bg-booqit-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group",
                    isActive
                      ? "bg-booqit-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="md:hidden lg:block font-medium">{item.label}</span>
                  
                  {/* Tooltip for medium screens */}
                  <div className="hidden md:block lg:hidden absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <div className="grid grid-cols-4 gap-1">
            {navItems.slice(0, 4).map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-booqit-primary text-white"
                      : "text-gray-600"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideNavigation;
