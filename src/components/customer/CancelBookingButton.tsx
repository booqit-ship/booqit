
import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { format, parseISO, isBefore, subHours } from 'date-fns';

interface CancelBookingButtonProps {
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  bookingStatus: string;
  userId?: string;
  onCancelSuccess?: () => void;
  className?: string;
}

const CancelBookingButton: React.FC<CancelBookingButtonProps> = ({
  bookingId,
  bookingDate,
  bookingTime,
  bookingStatus,
  userId,
  onCancelSuccess,
  className = ''
}) => {
  const { cancelBooking, isCancelling } = useCancelBooking();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if booking can be cancelled (not cancelled/completed and at least 2 hours before appointment)
  const canCancel = () => {
    if (['cancelled', 'completed'].includes(bookingStatus)) {
      return false;
    }

    try {
      const appointmentDateTime = parseISO(`${bookingDate}T${bookingTime}`);
      const twoHoursBefore = subHours(appointmentDateTime, 2);
      return !isBefore(new Date(), twoHoursBefore);
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
      return false;
    }
  };

  const handleCancel = async () => {
    console.log('Attempting to cancel booking:', bookingId, 'for user:', userId);
    
    const success = await cancelBooking(bookingId, userId);
    if (success) {
      setIsDialogOpen(false);
      onCancelSuccess?.();
      
      // Force a page refresh after a short delay to ensure all data is updated
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  if (!canCancel()) {
    return null;
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className={`border-red-200 text-red-600 hover:bg-red-50 ${className}`}
          disabled={isCancelling}
        >
          <X className="h-4 w-4 mr-2" />
          {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            Cancel Booking
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this booking for{' '}
            <strong>{format(parseISO(bookingDate), 'MMM d, yyyy')}</strong> at{' '}
            <strong>{bookingTime}</strong>?
            <br />
            <br />
            This action cannot be undone and your time slot will be released for other customers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling}
            className="bg-red-600 hover:bg-red-700"
          >
            {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelBookingButton;
