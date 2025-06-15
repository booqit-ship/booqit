
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Star, Gift, PartyPopper, Heart } from 'lucide-react';

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
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Step 1: Show overlay
      setAnimationStep(1);
      
      // Step 2: Start confetti
      setTimeout(() => {
        setShowConfetti(true);
        setAnimationStep(2);
      }, 200);
      
      // Step 3: Show main elements
      setTimeout(() => {
        setShowElements(true);
        setAnimationStep(3);
      }, 500);
      
      // Step 4: Complete animation
      setTimeout(() => {
        setShowConfetti(false);
        setShowElements(false);
        setAnimationStep(0);
        onComplete();
      }, 3500);
    }
  }, [isVisible, onComplete]);

  // Generate controlled green confetti particles
  const confettiParticles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: 45 + (i % 5) * 2 + Math.random() * 10, // More controlled spread
    y: 40 + Math.random() * 20, // Upper area focus
    rotation: Math.random() * 360,
    delay: Math.random() * 0.6,
    size: 3 + Math.random() * 2,
    color: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'][i % 4] // Green palette
  }));

  // Controlled sparkle positions around the card
  const sparklePositions = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 40 + (i % 4) * 5 + Math.random() * 20,
    y: 30 + Math.floor(i / 4) * 40 + Math.random() * 15,
    delay: i * 0.15,
  }));

  // Floating hearts in organized pattern
  const floatingHearts = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    x: 35 + (i % 2) * 30 + Math.random() * 10,
    y: 70 + Math.floor(i / 2) * 10,
    delay: i * 0.4,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          {/* Background blur effect */}
          <div className="absolute inset-0 backdrop-blur-sm" />
          
          {/* Controlled green confetti explosion */}
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
                scale: [0, 1.8, 1.2, 0.9], 
                rotate: [0, particle.rotation, particle.rotation + 180],
                opacity: [1, 1, 0.8, 0] 
              }}
              transition={{ 
                duration: 2.2, 
                delay: particle.delay,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="absolute rounded-full shadow-lg"
              style={{ 
                backgroundColor: particle.color,
                width: particle.size,
                height: particle.size,
                boxShadow: `0 0 10px ${particle.color}40`
              }}
            />
          ))}

          {/* Organized sparkles around the card */}
          {showElements && sparklePositions.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.8, 1.4, 1.2], 
                rotate: [0, 180, 360], 
                opacity: [0, 1, 1, 0],
                y: [-15, 15, -15]
              }}
              transition={{ 
                duration: 2.8, 
                delay: sparkle.delay,
                repeat: 1,
                repeatDelay: 0.3,
                ease: "easeInOut"
              }}
              className="absolute"
              style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
            >
              <Sparkles className="w-7 h-7 text-emerald-400 drop-shadow-lg" />
            </motion.div>
          ))}

          {/* Organized floating hearts */}
          {showElements && floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.4, 1.1], 
                y: [-60, -90, -120],
                opacity: [0, 1, 0],
                rotate: [0, 20, -20, 0]
              }}
              transition={{ 
                duration: 3.2, 
                delay: heart.delay,
                ease: "easeOut"
              }}
              className="absolute"
              style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
            >
              <Heart className="w-6 h-6 text-pink-500 fill-current drop-shadow-lg" />
            </motion.div>
          ))}

          {/* Main popup card with better positioning */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 60 }}
            animate={{ 
              scale: animationStep >= 2 ? [0, 1.15, 1.05, 1] : 0,
              opacity: animationStep >= 2 ? 1 : 0,
              y: animationStep >= 2 ? 0 : 60
            }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full"
          >
            {/* Enhanced success checkmark with controlled green effects */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: animationStep >= 3 ? [0, 1.6, 1.3, 1.1, 1] : 0
              }}
              transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden">
                <Check className="w-12 h-12 text-white" strokeWidth={4} />
                
                {/* Controlled shine effect */}
                <motion.div
                  animate={{ 
                    x: [-120, 120],
                    opacity: [0, 0.6, 0]
                  }}
                  transition={{ duration: 1.8, delay: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12"
                />
              </div>
              
              {/* Controlled pulse rings with green theme */}
              <motion.div
                animate={{ 
                  scale: [1, 2.2], 
                  opacity: [0.7, 0] 
                }}
                transition={{ 
                  duration: 1.8, 
                  repeat: 2, 
                  delay: 0.5,
                  ease: "easeOut"
                }}
                className="absolute inset-0 bg-emerald-400 rounded-full"
              />
              <motion.div
                animate={{ 
                  scale: [1, 2.8], 
                  opacity: [0.5, 0] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: 2, 
                  delay: 0.8,
                  ease: "easeOut"
                }}
                className="absolute inset-0 bg-green-300 rounded-full"
              />
            </motion.div>

            {/* Success text with enhanced alignment */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ 
                y: animationStep >= 3 ? 0 : 40,
                opacity: animationStep >= 3 ? 1 : 0
              }}
              transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
              className="text-center"
            >
              <motion.h1 
                className="text-3xl font-bold text-gray-800 mb-4"
                animate={{ 
                  scale: animationStep >= 3 ? [1, 1.08, 1] : 1
                }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                🎉 Booking Confirmed!
              </motion.h1>
              
              <motion.p 
                className="text-gray-600 mb-6 text-lg leading-relaxed"
                initial={{ y: 25, opacity: 0 }}
                animate={{ 
                  y: animationStep >= 3 ? 0 : 25,
                  opacity: animationStep >= 3 ? 1 : 0
                }}
                transition={{ delay: 1.3, duration: 0.6 }}
              >
                Your appointment is all set!
              </motion.p>
            </motion.div>

            {/* Organized celebration icons around the card */}
            <div className="absolute -inset-12 pointer-events-none">
              <motion.div
                animate={{ 
                  y: [-10, 10, -10],
                  rotate: [-8, 8, -8],
                  scale: [1, 1.15, 1]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-6 -top-6"
              >
                <Star className="w-9 h-9 text-yellow-400 fill-current drop-shadow-lg" />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [12, -12, 12],
                  rotate: [6, -6, 6],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 2.8, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.4 
                }}
                className="absolute -right-6 -top-4"
              >
                <Gift className="w-8 h-8 text-purple-500 drop-shadow-lg" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [-4, 4, -4],
                  scale: [1, 1.25, 1]
                }}
                transition={{ 
                  duration: 2.2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.8 
                }}
                className="absolute -left-4 -bottom-6"
              >
                <PartyPopper className="w-7 h-7 text-pink-500 drop-shadow-lg" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [10, -10, 10],
                  rotate: [5, -5, 5],
                  scale: [1, 1.15, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 1.2 
                }}
                className="absolute -right-4 -bottom-4"
              >
                <Sparkles className="w-7 h-7 text-blue-500 drop-shadow-lg" />
              </motion.div>
            </div>

            {/* Enhanced success message card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 25 }}
              animate={{ 
                scale: animationStep >= 3 ? 1 : 0.9,
                opacity: animationStep >= 3 ? 1 : 0,
                y: animationStep >= 3 ? 0 : 25
              }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="mt-6 p-5 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 rounded-2xl border border-emerald-200 shadow-sm"
            >
              <p className="text-emerald-700 font-medium text-center leading-relaxed">
                ✨ Get ready for an amazing experience!
              </p>
            </motion.div>

            {/* Controlled progress indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: animationStep >= 3 ? "100%" : "0%" }}
              transition={{ duration: 3.2, delay: 1.9, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 rounded-b-3xl shadow-sm"
            />
          </motion.div>

          {/* Subtle rotating background pattern */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5 pointer-events-none"
          >
            <div className="w-full h-full border-4 border-dashed border-emerald-300 rounded-full"></div>
            <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dotted border-green-300 rounded-full"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSuccessAnimation;
