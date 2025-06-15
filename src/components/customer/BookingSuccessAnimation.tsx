
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Star, Gift, PartyPopper } from 'lucide-react';

interface BookingSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

const BookingSuccessAnimation: React.FC<BookingSuccessAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showElements, setShowElements] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      setTimeout(() => setShowElements(true), 300);
      setTimeout(() => {
        setShowConfetti(false);
        setShowElements(false);
        onComplete();
      }, 3000);
    }
  }, [isVisible, onComplete]);

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5,
  }));

  const sparklePositions = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 20 + (i * 10) + Math.random() * 20,
    y: 20 + Math.random() * 60,
    delay: i * 0.1,
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
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50" />
          
          {/* Confetti particles */}
          {showConfetti && confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                x: '50vw', 
                y: '50vh', 
                scale: 0, 
                rotate: 0,
                opacity: 1 
              }}
              animate={{ 
                x: `${particle.x}vw`, 
                y: `${particle.y}vh`, 
                scale: [0, 1, 0.8], 
                rotate: particle.rotation,
                opacity: [1, 1, 0] 
              }}
              transition={{ 
                duration: 2, 
                delay: particle.delay,
                ease: "easeOut" 
              }}
              className="absolute w-3 h-3 rounded"
              style={{
                backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][particle.id % 5]
              }}
            />
          ))}

          {/* Floating sparkles */}
          {showElements && sparklePositions.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1], 
                rotate: [0, 180, 360], 
                opacity: [0, 1, 0] 
              }}
              transition={{ 
                duration: 2, 
                delay: sparkle.delay,
                repeat: Infinity,
                repeatDelay: 1 
              }}
              className="absolute"
              style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}

          {/* Main content */}
          <div className="relative z-10 text-center px-8">
            {/* Success checkmark with pulse effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6, ease: "backOut" }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
              
              {/* Pulse rings */}
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-green-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 bg-green-300 rounded-full"
              />
            </motion.div>

            {/* Success text with bounce animation */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                🎉 Booking Confirmed!
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Your appointment has been successfully booked
              </p>
            </motion.div>

            {/* Floating icons */}
            <div className="relative">
              <motion.div
                animate={{ 
                  y: [-10, 10, -10],
                  rotate: [-5, 5, -5] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-12 -top-8"
              >
                <Star className="w-8 h-8 text-yellow-400 fill-current" />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [10, -10, 10],
                  rotate: [5, -5, 5] 
                }}
                transition={{ 
                  duration: 2.2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -right-12 -top-4"
              >
                <Gift className="w-8 h-8 text-purple-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [-3, 3, -3] 
                }}
                transition={{ 
                  duration: 1.8, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-8 top-8"
              >
                <PartyPopper className="w-6 h-6 text-pink-500" />
              </motion.div>
            </div>

            {/* Success message */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-8 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200 shadow-lg"
            >
              <p className="text-green-700 font-medium">
                ✨ Get ready for an amazing experience!
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSuccessAnimation;
