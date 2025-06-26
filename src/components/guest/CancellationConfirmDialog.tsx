
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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-righteous text-xl text-red-600">
            Cancel Booking?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-gray-600 font-poppins">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800">{booking.shop_name}</p>
                    <p className="text-sm text-gray-600">{booking.shop_address}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800">{formatDate(booking.booking_date)}</p>
                    <p className="text-sm text-gray-600">{formatTime(booking.booking_time)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800">{booking.service_name}</p>
                    <p className="text-sm text-gray-600">
                      {booking.service_duration} minutes • ₹{booking.service_price}
                      {booking.stylist_name && ` • with ${booking.stylist_name}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-poppins">Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 font-poppins"
          >
            Yes, Cancel Booking
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
