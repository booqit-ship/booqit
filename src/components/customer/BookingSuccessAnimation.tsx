
import React from 'react';
import { CheckCircle2, Sparkles, Calendar, Clock } from 'lucide-react';

interface BookingSuccessAnimationProps {
  merchantName: string;
  bookingDate: string;
  bookingTime: string;
}

const BookingSuccessAnimation: React.FC<BookingSuccessAnimationProps> = ({
  merchantName,
  bookingDate,
  bookingTime
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-scale-in">
        {/* Header with animated background */}
        <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
          {/* Floating sparkles */}
          <div className="absolute inset-0 overflow-hidden">
            <Sparkles className="absolute top-4 left-4 h-4 w-4 text-white/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute top-6 right-6 h-3 w-3 text-white/40 animate-pulse" style={{ animationDelay: '1s' }} />
            <Sparkles className="absolute bottom-4 left-8 h-5 w-5 text-white/50 animate-pulse" style={{ animationDelay: '1.5s' }} />
            <Sparkles className="absolute bottom-6 right-4 h-4 w-4 text-white/60 animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Success icon with animation */}
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <CheckCircle2 className="h-12 w-12 text-white animate-fade-in" style={{ animationDelay: '0.6s' }} />
            </div>
            
            {/* Ripple effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0.8s' }}></div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in" style={{ animationDelay: '0.9s' }}>
            Booking Confirmed!
          </h2>
          <p className="text-white/90 animate-fade-in" style={{ animationDelay: '1.1s' }}>
            Your appointment is all set
          </p>
        </div>

        {/* Booking details with staggered animation */}
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-3 animate-slide-in-right" style={{ animationDelay: '1.3s' }}>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Shop</p>
              <p className="font-semibold text-gray-900">{merchantName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 animate-slide-in-right" style={{ animationDelay: '1.5s' }}>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold text-gray-900">{bookingDate}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 animate-slide-in-right" style={{ animationDelay: '1.7s' }}>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-semibold text-gray-900">{bookingTime}</p>
            </div>
          </div>
        </div>

        {/* Success message */}
        <div className="px-6 pb-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in" style={{ animationDelay: '1.9s' }}>
            <p className="text-green-800 text-sm text-center">
              🎉 You're all set! We'll send you a reminder before your appointment.
            </p>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 animate-slide-in-right origin-left" style={{ animationDelay: '2.1s', animationDuration: '1s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessAnimation;
