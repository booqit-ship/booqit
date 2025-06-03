
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ duration: 0.8, ease: "easeOut" }} 
          className="mb-8"
        >
          <div className="text-6xl md:text-8xl font-righteous tracking-tight">
            <span className="text-black">booq</span>
            <span className="text-black">it</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 1, duration: 0.5 }} 
          className="flex space-x-2"
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1, delay: 0 }} 
            className="w-3 h-3 bg-blue-600 rounded-full" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} 
            className="w-3 h-3 bg-blue-600 rounded-full" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} 
            className="w-3 h-3 bg-blue-600 rounded-full" 
          />
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;
