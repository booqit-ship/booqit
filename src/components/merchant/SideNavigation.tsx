
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  List, 
  Calendar, 
  Users, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const SideNavigation: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const navItems: NavItem[] = [
    {
      path: '/merchant',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      path: '/merchant/services',
      label: 'Services',
      icon: <List className="w-5 h-5" />
    },
    {
      path: '/merchant/calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      path: '/merchant/customers',
      label: 'Customers',
      icon: <Users className="w-5 h-5" />
    },
    {
      path: '/merchant/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <>
      {/* Mobile bottom navigation for merchants */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative flex-1 max-w-[80px]",
                  isActive 
                    ? "text-booqit-primary bg-booqit-primary/5" 
                    : "text-gray-500 hover:text-booqit-primary/80"
                )}
              >
                <div className="flex flex-col items-center space-y-1">
                  {item.icon}
                  <span className={cn(
                    "text-xs leading-none",
                    isActive ? "font-medium" : "font-normal"
                  )}>
                    {item.label}
                  </span>
                </div>
                
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-booqit-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Desktop side navigation */}
      <div className={cn(
        "hidden md:flex fixed left-0 top-0 h-screen bg-white z-40 flex-col transition-all duration-300 shadow-md",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && (
            <h1 className="font-bold text-xl text-booqit-primary">BooqIt</h1>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-2 rounded-md hover:bg-gray-100",
              isCollapsed ? "mx-auto" : ""
            )}
          >
            {isCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
              </svg>
            )}
          </button>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center py-3 px-3 rounded-md transition-colors",
                      isActive 
                        ? "bg-booqit-primary/10 text-booqit-primary" 
                        : "text-gray-600 hover:bg-gray-100",
                      isCollapsed ? "justify-center" : ""
                    )}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <span className="ml-3">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full justify-center",
              isCollapsed ? "p-2" : ""
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </>
  );
};

export default SideNavigation;
