
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  
  const navItems: NavItem[] = [
    {
      path: '/home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
      )
    },
    {
      path: '/search',
      label: 'Search',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      )
    },
    {
      path: '/calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-20 px-4 z-50 shadow-lg">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center space-y-1 tap-highlight-transparent py-2"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-200",
              isActive 
                ? "bg-booqit-primary text-white shadow-md" 
                : "text-gray-400 hover:text-gray-600"
            )}>
              {item.icon}
            </div>
            <span className={cn(
              "text-xs transition-colors duration-200",
              isActive 
                ? "text-booqit-primary font-medium" 
                : "text-gray-400"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigation;
