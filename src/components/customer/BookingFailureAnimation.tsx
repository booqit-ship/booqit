
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ZapOff } from 'lucide-react';

interface BookingFailureAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

const BookingFailureAnimation: React.FC<BookingFailureAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const [showElements, setShowElements] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setShowElements(true), 200);
      setTimeout(() => {
        setShowElements(false);
        onComplete();
      }, 3000);
    }
  }, [isVisible, onComplete]);

  // Generate floating error particles
  const errorParticles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    y: 20 + Math.random() * 60,
    delay: Math.random() * 0.8,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50" />
          
          {/* Floating error particles */}
          {showElements && errorParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ 
                scale: [0, 1, 0.8], 
                opacity: [0, 1, 0],
                y: [-20, 20, -20] 
              }}
              transition={{ 
                duration: 2, 
                delay: particle.delay,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut" 
              }}
              className="absolute"
              style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            >
              <ZapOff className="w-4 h-4 text-red-400" />
            </motion.div>
          ))}

          {/* Main content */}
          <div className="relative z-10 text-center px-8">
            {/* Error icon with shake effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: "backOut" }}
              className="mx-auto mb-6 relative"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="w-24 h-24 mx-auto bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg"
              >
                <X className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>
              
              {/* Error pulse rings */}
              <motion.div
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-0 bg-red-400 rounded-full"
              />
            </motion.div>

            {/* Error text with bounce animation */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                😔 Booking Failed
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Something went wrong with your payment
              </p>
            </motion.div>

            {/* Floating warning icons */}
            <div className="relative">
              <motion.div
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [-10, 10, -10] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-16 -top-8"
              >
                <Zap className="w-6 h-6 text-orange-500" />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [10, -10, 10],
                  rotate: [8, -8, 8] 
                }}
                transition={{ 
                  duration: 2.4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -right-16 -top-4"
              >
                <ZapOff className="w-6 h-6 text-red-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [-6, 6, -6],
                  rotate: [-5, 5, -5] 
                }}
                transition={{ 
                  duration: 1.6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-8 top-12"
              >
                <X className="w-5 h-5 text-red-400" />
              </motion.div>
            </div>

            {/* Error message */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-8 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 shadow-lg"
            >
              <p className="text-red-700 font-medium">
                💔 Don't worry, you can try again!
              </p>
            </motion.div>

            {/* Subtle background pattern */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5"
            >
              <div className="w-full h-full border-4 border-dashed border-red-300 rounded-full"></div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingFailureAnimation;
