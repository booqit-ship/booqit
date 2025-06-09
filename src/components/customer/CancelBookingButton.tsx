
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
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

interface CancelBookingButtonProps {
  bookingId: string;
  onCancelled?: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const CancelBookingButton: React.FC<CancelBookingButtonProps> = ({
  bookingId,
  onCancelled,
  variant = 'destructive',
  size = 'sm',
  className = ''
}) => {
  const [loading, setLoading] = useState(false);

  const handleCancelBooking = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('You must be logged in to cancel bookings');
        return;
      }

      // Call the updated cancellation function
      const { data, error } = await supabase.rpc('cancel_booking_properly', {
        p_booking_id: bookingId,
        p_user_id: user.id
      });

      if (error) {
        console.error('Error cancelling booking:', error);
        toast.error('Failed to cancel booking. Please try again.');
        return;
      }

      // Type assert the response data
      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast.error(result.error || 'Failed to cancel booking');
        return;
      }

      toast.success(result.message || 'Booking cancelled successfully');
      
      // Call the onCancelled callback if provided
      if (onCancelled) {
        onCancelled();
      }

    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-1" />
              Cancel
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this booking? This action cannot be undone, 
            and the time slot will become available for other customers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, Keep Booking</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCancelBooking}
            className="bg-red-600 hover:bg-red-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Booking'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelBookingButton;
