
import React from 'react';
import { Button } from '@/components/ui/button';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { AlertTriangle } from 'lucide-react';

interface CancelBookingButtonProps {
  bookingId: string;
  onCancelled: () => void;
  className?: string;
}

const CancelBookingButton: React.FC<CancelBookingButtonProps> = ({
  bookingId,
  onCancelled,
  className = ""
}) => {
  const { cancelBooking, isCancelling } = useCancelBooking();

  const handleCancel = async () => {
    const success = await cancelBooking(bookingId);
    if (success) {
      onCancelled();
    }
  };

  return (
    <Button
      onClick={handleCancel}
      disabled={isCancelling}
      variant="destructive"
      className={`w-full ${className}`}
      size="lg"
    >
      {isCancelling ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          Cancelling...
        </div>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Cancel Booking
        </>
      )}
    </Button>
  );
};

export default CancelBookingButton;
