import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationStackItem {
  id: string;
  type: 'page' | 'modal' | 'widget' | 'tab';
  path: string;
  title?: string;
  data?: any;
}

interface NavigationStackContextType {
  stack: NavigationStackItem[];
  pushToStack: (item: NavigationStackItem) => void;
  popFromStack: () => NavigationStackItem | null;
  clearStack: () => void;
  getCurrentItem: () => NavigationStackItem | null;
  hasItems: () => boolean;
}

const NavigationStackContext = createContext<NavigationStackContextType | undefined>(undefined);

export const NavigationStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<NavigationStackItem[]>([]);

  const pushToStack = useCallback((item: NavigationStackItem) => {
    console.log('📱 Navigation: Pushing to stack:', item);
    setStack(prev => [...prev, item]);
  }, []);

  const popFromStack = useCallback(() => {
    let poppedItem: NavigationStackItem | null = null;
    setStack(prev => {
      if (prev.length > 0) {
        poppedItem = prev[prev.length - 1];
        console.log('📱 Navigation: Popping from stack:', poppedItem);
        return prev.slice(0, -1);
      }
      return prev;
    });
    return poppedItem;
  }, []);

  const clearStack = useCallback(() => {
    console.log('📱 Navigation: Clearing stack');
    setStack([]);
  }, []);

  const getCurrentItem = useCallback(() => {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, [stack]);

  const hasItems = useCallback(() => {
    return stack.length > 0;
  }, [stack]);

  return (
    <NavigationStackContext.Provider value={{
      stack,
      pushToStack,
      popFromStack,
      clearStack,
      getCurrentItem,
      hasItems
    }}>
      {children}
    </NavigationStackContext.Provider>
  );
};

export const useNavigationStack = () => {
  const context = useContext(NavigationStackContext);
  if (context === undefined) {
    throw new Error('useNavigationStack must be used within a NavigationStackProvider');
  }
  return context;
};