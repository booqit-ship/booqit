
import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedButton } from './AnimatedButton';

interface FloatingBottomBarProps {
  children: React.ReactNode;
  className?: string;
}

export const FloatingBottomBar: React.FC<FloatingBottomBarProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`
        fixed bottom-0 left-0 right-0 p-4 
        bg-white/95 backdrop-blur-sm border-t border-gray-200 
        shadow-2xl z-40
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
