
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { parseISO, differenceInHours } from 'date-fns';

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
  className = ""
}) => {
  const { cancelBooking, isCancelling } = useCancelBooking();

  const handleCancel = async () => {
    // Check if booking can be cancelled (must be at least 2 hours before appointment)
    try {
      const bookingDateTime = parseISO(`${bookingDate}T${bookingTime}`);
      const hoursUntilBooking = differenceInHours(bookingDateTime, new Date());
      
      if (hoursUntilBooking < 2) {
        alert('You can only cancel bookings at least 2 hours in advance.');
        return;
      }

      if (window.confirm('Are you sure you want to cancel this booking?')) {
        const success = await cancelBooking(bookingId, userId);
        if (success && onCancelSuccess) {
          onCancelSuccess();
        }
      }
    } catch (error) {
      console.error('Error parsing booking date/time:', error);
      alert('Error processing cancellation. Please try again.');
    }
  };

  // Don't show cancel button for already cancelled or completed bookings
  if (bookingStatus === 'cancelled' || bookingStatus === 'completed') {
    return null;
  }

  // Check if cancellation is allowed (2 hours before)
  let canCancel = false;
  try {
    const bookingDateTime = parseISO(`${bookingDate}T${bookingTime}`);
    const hoursUntilBooking = differenceInHours(bookingDateTime, new Date());
    canCancel = hoursUntilBooking >= 2;
  } catch (error) {
    console.error('Error parsing booking date/time for cancellation check:', error);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCancel}
      disabled={isCancelling || !canCancel}
      className={`text-red-600 border-red-200 hover:bg-red-50 ${className}`}
    >
      <X className="h-3 w-3 mr-1" />
      {isCancelling ? 'Cancelling...' : canCancel ? 'Cancel' : 'Cannot Cancel'}
    </Button>
  );
};

export default CancelBookingButton;
