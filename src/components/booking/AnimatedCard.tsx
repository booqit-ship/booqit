
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  onClick,
  selected = false,
  disabled = false
}) => {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <Card className={`
        border-2 transition-all duration-300 shadow-lg hover:shadow-xl
        ${selected 
          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100' 
          : 'border-gray-200 hover:border-purple-300'
        }
        ${className}
      `}>
        <CardContent className="p-0">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};
