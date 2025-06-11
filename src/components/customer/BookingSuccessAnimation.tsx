
import React, { useEffect, useState } from 'react';
import { CheckCircle, Calendar, Clock, Sparkles } from 'lucide-react';

interface BookingSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  bookingDetails?: {
    shopName?: string;
    date?: string;
    time?: string;
  };
}

const BookingSuccessAnimation: React.FC<BookingSuccessAnimationProps> = ({
  isVisible,
  onComplete,
  bookingDetails
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const steps = [
      { delay: 0, step: 1 },     // Initial animation
      { delay: 800, step: 2 },   // Success icon
      { delay: 1600, step: 3 },  // Details appear
      { delay: 3200, step: 4 },  // Fade out starts
    ];

    const timeouts = steps.map(({ delay, step }) =>
      setTimeout(() => setCurrentStep(step), delay)
    );

    // Complete animation after 4 seconds
    const completeTimeout = setTimeout(onComplete, 4000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4">
        {/* Background Card */}
        <div 
          className={`
            bg-white rounded-3xl shadow-2xl p-8 text-center transform transition-all duration-700 ease-out
            ${currentStep >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
            ${currentStep >= 4 ? 'scale-105 opacity-0' : ''}
          `}
        >
          {/* Floating Sparkles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <Sparkles
                key={i}
                className={`
                  absolute h-4 w-4 text-booqit-primary/30 animate-float
                  ${currentStep >= 2 ? 'opacity-100' : 'opacity-0'}
                  transition-opacity duration-500
                `}
                style={{
                  left: `${20 + (i * 15)}%`,
                  top: `${10 + (i % 3) * 25}%`,
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>

          {/* Success Icon */}
          <div className="relative mb-6">
            <div 
              className={`
                mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center
                transform transition-all duration-700 ease-out
                ${currentStep >= 2 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}
              `}
            >
              <CheckCircle 
                className={`
                  h-10 w-10 text-green-600 transition-all duration-500
                  ${currentStep >= 2 ? 'scale-100' : 'scale-0'}
                `} 
              />
            </div>
            
            {/* Ripple Effect */}
            <div 
              className={`
                absolute inset-0 border-4 border-green-200 rounded-full
                animate-ping transition-opacity duration-1000
                ${currentStep >= 2 && currentStep < 4 ? 'opacity-30' : 'opacity-0'}
              `}
            />
          </div>

          {/* Success Text */}
          <div 
            className={`
              transform transition-all duration-700 ease-out delay-300
              ${currentStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            `}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked
            </p>
          </div>

          {/* Booking Details */}
          <div 
            className={`
              space-y-3 transform transition-all duration-700 ease-out delay-500
              ${currentStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            `}
          >
            {bookingDetails?.shopName && (
              <div className="flex items-center justify-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-booqit-primary rounded-full"></div>
                <span className="font-medium">{bookingDetails.shopName}</span>
              </div>
            )}
            
            {bookingDetails?.date && (
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{bookingDetails.date}</span>
              </div>
            )}
            
            {bookingDetails?.time && (
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{bookingDetails.time}</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-8 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-booqit-primary h-1 rounded-full transition-all duration-4000 ease-out"
              style={{ 
                width: currentStep >= 1 ? '100%' : '0%',
                transitionDuration: '3.5s'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessAnimation;
