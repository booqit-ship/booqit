
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  progress?: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  progress = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-50 shadow-lg"
    >
      <div className="p-4">
        <div className="relative flex items-center justify-center mb-4">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-0 text-white hover:bg-white/20 transition-colors"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="text-center">
            <h1 className="text-xl font-righteous font-bold">{title}</h1>
            {subtitle && (
              <p className="text-purple-100 font-poppins text-sm mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {progress > 0 && (
          <div className="w-full bg-purple-500/30 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-white h-2 rounded-full"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
