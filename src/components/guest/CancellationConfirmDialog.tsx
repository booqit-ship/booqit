
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface GuestBooking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  shop_name: string;
  shop_address: string;
  service_name: string;
  service_duration: number;
  service_price: number;
  stylist_name: string | null;
}

interface CancellationConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  booking: GuestBooking | null;
}

export const CancellationConfirmDialog: React.FC<CancellationConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  booking
}) => {
  if (!booking) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-righteous text-base sm:text-lg md:text-xl text-red-600">
            Cancel Booking?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-gray-600 font-poppins text-xs sm:text-sm md:text-base">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex items-start">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs sm:text-sm md:text-base break-words leading-tight">{booking.shop_name}</p>
                    <p className="text-xs sm:text-sm text-gray-600 break-words leading-tight">{booking.shop_address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs sm:text-sm md:text-base break-words">{formatDate(booking.booking_date)}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{formatTime(booking.booking_time)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs sm:text-sm md:text-base break-words leading-tight">{booking.service_name}</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {booking.service_duration} minutes • ₹{booking.service_price}
                      {booking.stylist_name && (
                        <span className="break-words"> • with {booking.stylist_name}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel className="font-poppins w-full sm:w-auto touch-manipulation min-h-[44px] text-sm sm:text-base">
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 font-poppins w-full sm:w-auto touch-manipulation min-h-[44px] text-sm sm:text-base"
          >
            Yes, Cancel Booking
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
