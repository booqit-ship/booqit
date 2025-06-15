
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Heart, Sparkles } from 'lucide-react';

interface BookingSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

const BookingSuccessAnimation: React.FC<BookingSuccessAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Step 1: Show overlay
      setAnimationStep(1);
      
      // Step 2: Show main elements
      setTimeout(() => {
        setAnimationStep(2);
      }, 200);
      
      // Step 3: Complete animation and cleanup
      setTimeout(() => {
        setAnimationStep(0);
        onComplete();
      }, 3000);
    }
  }, [isVisible, onComplete]);

  // Floating stars around the card - contained within card area
  const floatingStars = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    angle: (i * 60) * (Math.PI / 180), // Evenly distribute around circle
    radius: 80 + Math.random() * 40,
  }));

  // Gentle sparkles that stay near the card
  const gentleSparkles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    x: -30 + Math.random() * 60, // Relative to card center
    y: -30 + Math.random() * 60,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          {/* Main success card */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: animationStep >= 2 ? [0, 1.1, 1] : 0,
              opacity: animationStep >= 2 ? 1 : 0,
              y: animationStep >= 2 ? 0 : 50
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full overflow-hidden"
          >
            {/* Floating stars around the card */}
            {animationStep >= 2 && floatingStars.map((star) => (
              <motion.div
                key={star.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  opacity: [0, 1, 0.8],
                  x: Math.cos(star.angle) * star.radius,
                  y: Math.sin(star.angle) * star.radius,
                }}
                transition={{ 
                  duration: 2,
                  delay: star.delay,
                  repeat: 1,
                  repeatType: "reverse",
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              </motion.div>
            ))}

            {/* Gentle sparkles near the card */}
            {animationStep >= 2 && gentleSparkles.map((sparkle) => (
              <motion.div
                key={sparkle.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.3, 1, 0],
                  opacity: [0, 1, 0.7, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 1.8,
                  delay: sparkle.delay,
                  ease: "easeInOut"
                }}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{ 
                  transform: `translate(${sparkle.x}px, ${sparkle.y}px)`
                }}
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
              </motion.div>
            ))}

            {/* Success checkmark with elegant glow */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: animationStep >= 2 ? [0, 1.3, 1] : 0
              }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl relative">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
                
                {/* Gentle pulse effect */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1], 
                    opacity: [0.3, 0.1, 0.3] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-emerald-400 rounded-full"
                />
              </div>
            </motion.div>

            {/* Success text */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ 
                y: animationStep >= 2 ? 0 : 30,
                opacity: animationStep >= 2 ? 1 : 0
              }}
              transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold text-gray-800 mb-3 font-righteous">
                🎉 Booking Confirmed!
              </h1>
              
              <motion.p 
                className="text-gray-600 mb-6 text-base font-poppins"
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: animationStep >= 2 ? 0 : 20,
                  opacity: animationStep >= 2 ? 1 : 0
                }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Your appointment is all set!
              </motion.p>
            </motion.div>

            {/* Floating hearts with contained movement */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    opacity: [0, 0.8, 0],
                    y: [20, -40],
                    x: [0, (i % 2 === 0 ? 10 : -10)]
                  }}
                  transition={{ 
                    duration: 2.5,
                    delay: 0.8 + i * 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute"
                  style={{ 
                    left: `${30 + i * 15}%`, 
                    bottom: '20%' 
                  }}
                >
                  <Heart className="w-4 h-4 text-pink-400 fill-current" />
                </motion.div>
              ))}
            </div>

            {/* Success message card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ 
                scale: animationStep >= 2 ? 1 : 0.9,
                opacity: animationStep >= 2 ? 1 : 0,
                y: animationStep >= 2 ? 0 : 20
              }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200"
            >
              <p className="text-emerald-700 font-medium text-center text-sm font-poppins">
                ✨ Get ready for an amazing experience!
              </p>
            </motion.div>

            {/* Subtle progress bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: animationStep >= 2 ? "100%" : "0%" }}
              transition={{ duration: 2.8, delay: 1.2, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-b-3xl"
            />

            {/* Background decoration - contained within card */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-5"
              >
                <div className="w-full h-full border-2 border-dashed border-emerald-300 rounded-full"></div>
                <div className="absolute top-4 left-4 right-4 bottom-4 border border-dotted border-green-300 rounded-full"></div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSuccessAnimation;
