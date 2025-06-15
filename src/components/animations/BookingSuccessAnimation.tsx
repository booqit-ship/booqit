
import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingSuccessAnimationProps {
  onComplete: () => void;
  duration?: number;
}

const BookingSuccessAnimation: React.FC<BookingSuccessAnimationProps> = ({ 
  onComplete, 
  duration = 3000 
}) => {
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
      setTimeout(onComplete, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  const floatingElements = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    Icon: i % 4 === 0 ? Sparkles : i % 4 === 1 ? Heart : i % 4 === 2 ? Star : Sparkles,
    delay: i * 0.2,
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
    },
  }));

  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
        >
          {/* Floating decorative elements */}
          {floatingElements.map(({ id, Icon, delay, position }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.8],
                rotate: [0, 180, 360],
                y: [0, -20, 0]
              }}
              transition={{
                duration: 2,
                delay,
                repeat: Infinity,
                repeatType: "loop"
              }}
              className="absolute"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            >
              <Icon className="w-4 h-4 md:w-6 md:h-6 text-green-400" />
            </motion.div>
          ))}

          {/* Main content */}
          <div className="text-center px-4 max-w-md mx-auto">
            {/* Success circle with checkmark */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
              className="relative mx-auto mb-8"
            >
              {/* Outer rings */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.3, 0] }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
                className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-green-400"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: [0.9, 1.1, 1], opacity: [0, 0.5, 0] }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.3
                }}
                className="absolute inset-2 w-28 h-28 md:w-36 md:h-36 rounded-full bg-green-300"
              />
              
              {/* Main circle */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.8
                  }}
                >
                  <Check className="w-12 h-12 md:w-16 md:h-16 text-white stroke-[3]" />
                </motion.div>
              </div>
            </motion.div>

            {/* Success text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 font-righteous">
                Booking Confirmed!
              </h1>
              <p className="text-lg md:text-xl text-gray-600 font-poppins">
                Your appointment has been successfully booked
              </p>
              
              {/* Celebration particles */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="flex justify-center items-center space-x-2 text-yellow-500"
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-2xl">🎉</span>
                <Sparkles className="w-6 h-6" />
              </motion.div>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-8"
            >
              <div className="flex justify-center items-center space-x-2 text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-sm mt-2 font-poppins">Preparing your booking details...</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSuccessAnimation;
