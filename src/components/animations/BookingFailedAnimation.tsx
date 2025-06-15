
import React, { useEffect, useState } from 'react';
import { X, AlertCircle, RefreshCw, Frown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingFailedAnimationProps {
  onComplete: () => void;
  onRetry?: () => void;
  duration?: number;
}

const BookingFailedAnimation: React.FC<BookingFailedAnimationProps> = ({ 
  onComplete, 
  onRetry,
  duration = 4000 
}) => {
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
      setTimeout(onComplete, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  const floatingElements = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    Icon: i % 3 === 0 ? AlertCircle : i % 3 === 1 ? X : Frown,
    delay: i * 0.3,
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
    },
  }));

  const handleRetry = () => {
    if (onRetry) {
      setShowAnimation(false);
      setTimeout(() => {
        onRetry();
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-pink-50"
        >
          {/* Floating decorative elements */}
          {floatingElements.map(({ id, Icon, delay, position }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ 
                opacity: [0, 0.6, 0.6, 0],
                scale: [0, 1, 1, 0.5],
                rotate: [0, -10, 10, 0],
                y: [0, -15, 0]
              }}
              transition={{
                duration: 2.5,
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
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            </motion.div>
          ))}

          {/* Main content */}
          <div className="text-center px-4 max-w-md mx-auto">
            {/* Failed circle with X mark */}
            <motion.div
              initial={{ scale: 0, rotate: 180 }}
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
                animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.3, 0] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
                className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-red-400"
              />
              
              {/* Main circle */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-2xl flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.8
                  }}
                >
                  <X className="w-12 h-12 md:w-16 md:h-16 text-white stroke-[3]" />
                </motion.div>
              </div>
              
              {/* Shake effect */}
              <motion.div
                animate={{ x: [-2, 2, -2, 2, 0] }}
                transition={{ 
                  duration: 0.5,
                  delay: 1.5,
                  repeat: 2
                }}
                className="absolute inset-0"
              />
            </motion.div>

            {/* Failed text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 font-righteous">
                Booking Failed
              </h1>
              <p className="text-lg md:text-xl text-gray-600 font-poppins">
                Something went wrong with your payment
              </p>
              
              {/* Sad emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.1, 1] }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="text-4xl"
              >
                😔
              </motion.div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-8 space-y-3"
            >
              {onRetry && (
                <button
                  onClick={handleRetry}
                  className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white px-6 py-3 rounded-lg font-medium font-poppins flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Try Again</span>
                </button>
              )}
              
              {/* Loading indicator */}
              <div className="flex justify-center items-center space-x-2 text-gray-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-sm mt-2 font-poppins">Redirecting...</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingFailedAnimation;
