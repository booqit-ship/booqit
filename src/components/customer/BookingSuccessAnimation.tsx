
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

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.8,
    color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'][i % 6]
  }));

  const sparklePositions = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 15 + (i * 7) + Math.random() * 15,
    y: 15 + Math.random() * 70,
    delay: i * 0.1,
  }));

  const floatingHearts = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 80 + Math.random() * 20,
    delay: i * 0.3,
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
          
          {/* Confetti explosion */}
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
                scale: [0, 1.5, 1, 0.8], 
                rotate: [0, particle.rotation, particle.rotation + 180],
                opacity: [1, 1, 1, 0] 
              }}
              transition={{ 
                duration: 2.5, 
                delay: particle.delay,
                ease: "easeOut" 
              }}
              className="absolute w-3 h-3 rounded-full"
              style={{ backgroundColor: particle.color }}
            />
          ))}

          {/* Floating sparkles */}
          {showElements && sparklePositions.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 1.2, 1], 
                rotate: [0, 180, 360], 
                opacity: [0, 1, 1, 0],
                y: [-10, 10, -10]
              }}
              transition={{ 
                duration: 2.5, 
                delay: sparkle.delay,
                repeat: 1,
                repeatDelay: 0.5,
                ease: "easeInOut"
              }}
              className="absolute"
              style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}

          {/* Floating hearts */}
          {showElements && floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1], 
                y: [-50, -80, -100],
                opacity: [0, 1, 0],
                rotate: [0, 15, -15, 0]
              }}
              transition={{ 
                duration: 3, 
                delay: heart.delay,
                ease: "easeOut"
              }}
              className="absolute"
              style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
            >
              <Heart className="w-5 h-5 text-pink-500 fill-current" />
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
            {/* Success checkmark with pulse effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: animationStep >= 3 ? [0, 1.4, 1.2, 1] : 0
              }}
              transition={{ duration: 0.8, ease: "backOut", delay: 0.3 }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
                
                {/* Shine effect */}
                <motion.div
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12"
                />
              </div>
              
              {/* Pulse rings */}
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: 2, delay: 0.5 }}
                className="absolute inset-0 bg-green-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: 2, delay: 0.8 }}
                className="absolute inset-0 bg-emerald-300 rounded-full"
              />
            </motion.div>

            {/* Success text with stagger animation */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ 
                y: animationStep >= 3 ? 0 : 30,
                opacity: animationStep >= 3 ? 1 : 0
              }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-center"
            >
              <motion.h1 
                className="text-3xl font-bold text-gray-800 mb-3"
                animate={{ 
                  scale: animationStep >= 3 ? [1, 1.05, 1] : 1
                }}
                transition={{ duration: 0.4, delay: 1 }}
              >
                🎉 Booking Confirmed!
              </motion.h1>
              
              <motion.p 
                className="text-gray-600 mb-6 text-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: animationStep >= 3 ? 0 : 20,
                  opacity: animationStep >= 3 ? 1 : 0
                }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                Your appointment is all set!
              </motion.p>
            </motion.div>

            {/* Floating celebration icons around the card */}
            <div className="absolute -inset-8 pointer-events-none">
              <motion.div
                animate={{ 
                  y: [-8, 8, -8],
                  rotate: [-5, 5, -5],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -left-4 -top-4"
              >
                <Star className="w-8 h-8 text-yellow-400 fill-current" />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [10, -10, 10],
                  rotate: [5, -5, 5],
                  scale: [1, 1.15, 1]
                }}
                transition={{ 
                  duration: 2.2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.3 
                }}
                className="absolute -right-4 -top-2"
              >
                <Gift className="w-7 h-7 text-purple-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [-6, 6, -6],
                  rotate: [-3, 3, -3],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 1.8, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.6 
                }}
                className="absolute -left-2 -bottom-4"
              >
                <PartyPopper className="w-6 h-6 text-pink-500" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [8, -8, 8],
                  rotate: [4, -4, 4],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2.4, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.9 
                }}
                className="absolute -right-2 -bottom-2"
              >
                <Sparkles className="w-6 h-6 text-blue-500" />
              </motion.div>
            </div>

            {/* Success message card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ 
                scale: animationStep >= 3 ? 1 : 0.8,
                opacity: animationStep >= 3 ? 1 : 0,
                y: animationStep >= 3 ? 0 : 20
              }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200"
            >
              <p className="text-green-700 font-medium text-center">
                ✨ Get ready for an amazing experience!
              </p>
            </motion.div>

            {/* Subtle progress indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: animationStep >= 3 ? "100%" : "0%" }}
              transition={{ duration: 3, delay: 1.8 }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-3xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSuccessAnimation;
