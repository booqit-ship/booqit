
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ZapOff, AlertTriangle, RefreshCw } from 'lucide-react';

interface BookingFailureAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

const BookingFailureAnimation: React.FC<BookingFailureAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const [showElements, setShowElements] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Step 1: Show overlay
      setAnimationStep(1);
      
      // Step 2: Show main elements
      setTimeout(() => {
        setShowElements(true);
        setAnimationStep(2);
      }, 300);
      
      // Step 3: Complete animation
      setTimeout(() => {
        setShowElements(false);
        setAnimationStep(0);
        onComplete();
      }, 3500);
    }
  }, [isVisible, onComplete]);

  // Generate floating error particles
  const errorParticles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 25 + Math.random() * 50,
    y: 20 + Math.random() * 60,
    delay: Math.random() * 1,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          {/* Background blur effect */}
          <div className="absolute inset-0 backdrop-blur-sm" />
          
          {/* Floating error particles */}
          {showElements && errorParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ 
                scale: [0, 1.2, 0.9], 
                opacity: [0, 0.8, 0],
                y: [-30, 30, -30],
                rotate: [-10, 10, -10]
              }}
              transition={{ 
                duration: 2.5, 
                delay: particle.delay,
                repeat: 1,
                repeatDelay: 0.5,
                ease: "easeInOut" 
              }}
              className="absolute"
              style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            >
              <ZapOff className="w-4 h-4 text-red-400" />
            </motion.div>
          ))}

          {/* Main popup card */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: animationStep >= 2 ? [0, 1.1, 1] : 0,
              opacity: animationStep >= 2 ? 1 : 0,
              y: animationStep >= 2 ? 0 : 50
            }}
            transition={{ duration: 0.6, ease: "backOut" }}
            className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full"
          >
            {/* Error icon with shake effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: animationStep >= 2 ? [0, 1.3, 1.1, 1] : 0
              }}
              transition={{ duration: 0.8, ease: "backOut", delay: 0.2 }}
              className="mx-auto mb-6 relative"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 0.8, delay: 0.8, repeat: 1 }}
                className="w-20 h-20 mx-auto bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden"
              >
                <X className="w-10 h-10 text-white" strokeWidth={3} />
                
                {/* Error pulse effect */}
                <motion.div
                  animate={{ scale: [1, 1.2] }}
                  transition={{ duration: 0.3, repeat: 3, delay: 0.5 }}
                  className="absolute inset-0 bg-red-500 rounded-full opacity-30"
                />
              </motion.div>
              
              {/* Error pulse rings */}
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: 2, delay: 0.4 }}
                className="absolute inset-0 bg-red-400 rounded-full"
              />
            </motion.div>

            {/* Error text with bounce animation */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ 
                y: animationStep >= 2 ? 0 : 30,
                opacity: animationStep >= 2 ? 1 : 0
              }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-center"
            >
              <motion.h1 
                className="text-3xl font-bold text-gray-800 mb-3"
                animate={{ 
                  scale: animationStep >= 2 ? [1, 1.05, 1] : 1
                }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                😔 Booking Failed
              </motion.h1>
              
              <motion.p 
                className="text-gray-600 mb-6 text-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: animationStep >= 2 ? 0 : 20,
                  opacity: animationStep >= 2 ? 1 : 0
                }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                Something went wrong with your payment
              </motion.p>
            </motion.div>

            {/* Floating warning icons around the card */}
            <div className="absolute -inset-8 pointer-events-none">
              <motion.div
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [-10, 10, -10],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-4 -top-4"
              >
                <Zap className="w-6 h-6 text-orange-500" />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [10, -10, 10],
                  rotate: [8, -8, 8],
                  scale: [1, 1.15, 1]
                }}
                transition={{ 
                  duration: 2.4, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.3 
                }}
                className="absolute -right-4 -top-2"
              >
                <ZapOff className="w-6 h-6 text-red-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [-6, 6, -6],
                  rotate: [-5, 5, -5],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 1.6, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.6 
                }}
                className="absolute -left-2 -bottom-4"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: 0.9 
                }}
                className="absolute -right-2 -bottom-2"
              >
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </motion.div>
            </div>

            {/* Error message card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ 
                scale: animationStep >= 2 ? 1 : 0.8,
                opacity: animationStep >= 2 ? 1 : 0,
                y: animationStep >= 2 ? 0 : 20
              }}
              transition={{ delay: 1.3, duration: 0.5 }}
              className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200"
            >
              <p className="text-red-700 font-medium text-center">
                💔 Don't worry, you can try again!
              </p>
            </motion.div>

            {/* Subtle progress indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: animationStep >= 2 ? "100%" : "0%" }}
              transition={{ duration: 3, delay: 1.6 }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-400 to-orange-500 rounded-b-3xl"
            />
          </motion.div>

          {/* Subtle background pattern */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5 pointer-events-none"
          >
            <div className="w-full h-full border-4 border-dashed border-red-300 rounded-full"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingFailureAnimation;
