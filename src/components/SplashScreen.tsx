
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-booqit-primary to-purple-800 z-50">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <svg 
            className="w-24 h-24" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="45" fill="white" />
            <path 
              d="M35 30H50C58.284 30 65 36.716 65 45C65 53.284 58.284 60 50 60H35V30Z" 
              fill="#7E57C2" 
            />
            <path 
              d="M35 60H50C58.284 60 65 66.716 65 75C65 83.284 58.284 90 50 90H35V60Z" 
              fill="#FF6B6B" 
            />
            <circle cx="35" cy="45" r="15" fill="#4ECDC4" />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl font-bold text-white"
        >
          BooqIt
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-white text-lg mt-2"
        >
          Booking Made Simple
        </motion.p>
      </div>
    </div>
  );
};

export default SplashScreen;
