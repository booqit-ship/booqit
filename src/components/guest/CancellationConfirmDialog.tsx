
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
import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

interface BookingData {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  shop_name: string;
  service_name: string;
  service_price: number;
  stylist_name?: string;
}

interface CancellationConfirmDialogProps {
  booking: BookingData;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const CancellationConfirmDialog: React.FC<CancellationConfirmDialogProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirm,
  isLoading
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600 font-righteous">
            Cancel Booking?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-poppins text-gray-600">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            {/* Booking Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 font-poppins">Booking ID</p>
                <p className="font-mono text-sm font-semibold text-gray-800">
                  {booking.booking_id.slice(0, 8)}...
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span className="font-poppins text-gray-700">{booking.shop_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="font-poppins text-gray-700">
                  {formatDateInIST(new Date(booking.booking_date), 'EEE, MMM d, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="font-poppins text-gray-700">
                  {formatTimeToAmPm(booking.booking_time)}
                  {booking.stylist_name && ` • with ${booking.stylist_name}`}
                </span>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-poppins text-gray-700">{booking.service_name}</span>
                  <span className="font-semibold text-purple-600">₹{booking.service_price}</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isLoading}
            className="font-poppins"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 font-poppins"
          >
            {isLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancellationConfirmDialog;
