
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  gradient?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'md',
  className = '',
  gradient = false
}) => {
  const baseClasses = gradient 
    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0'
    : '';

  return (
    <motion.div
      whileHover={!disabled && !loading ? { scale: 1.05 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        variant={variant}
        size={size}
        className={`
          ${baseClasses}
          ${size === 'lg' ? 'py-6 text-lg' : ''}
          ${size === 'md' ? 'py-4 text-base' : ''}
          font-poppins font-semibold shadow-lg hover:shadow-xl transition-all duration-300
          ${className}
        `}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </Button>
    </motion.div>
  );
};
