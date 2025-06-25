
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { NotificationTemplateService } from '@/services/NotificationTemplateService';
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
      console.log('🚫 CUSTOMER: Cancelling booking:', bookingId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('You must be logged in to cancel bookings');
        return;
      }

      // Get booking details first for notifications
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants!inner(shop_name, user_id),
          services!inner(name)
        `)
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ CUSTOMER: Error fetching booking:', fetchError);
        toast.error('Failed to fetch booking details');
        return;
      }

      // Direct status update - no RPC calls
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled'
        })
        .eq('id', bookingId)
        .eq('user_id', user.id);

      if (cancelError) {
        console.error('❌ CUSTOMER: Error cancelling booking:', cancelError);
        toast.error('Failed to cancel booking. Please try again.');
        return;
      }

      console.log('✅ CUSTOMER: Booking cancelled successfully');

      // Send standardized notifications
      try {
        const dateTimeFormatted = NotificationTemplateService.formatDateTime(
          bookingData.date, 
          bookingData.time_slot
        );

        // Notify merchant about cancellation
        if (bookingData.merchants?.user_id) {
          await NotificationTemplateService.sendStandardizedNotification(
            bookingData.merchants.user_id,
            'booking_cancelled',
            {
              type: 'booking_cancelled',
              bookingId,
              customerName: bookingData.customer_name || 'Customer',
              serviceName: bookingData.services?.name || 'Service',
              dateTime: dateTimeFormatted
            }
          );
          console.log('📧 CUSTOMER: Merchant notification sent');
        }

        // Notify customer (confirmation)
        await NotificationTemplateService.sendStandardizedNotification(
          user.id,
          'booking_cancelled',
          {
            type: 'booking_cancelled',
            bookingId,
            shopName: bookingData.merchants?.shop_name || 'Shop',
            serviceName: bookingData.services?.name || 'Service',
            dateTime: dateTimeFormatted
          }
        );
        console.log('📧 CUSTOMER: Customer confirmation sent');
      } catch (notificationError) {
        console.error('❌ CUSTOMER: Notification error:', notificationError);
        // Don't fail the cancellation for notification issues
      }

      toast.success('Booking cancelled successfully');
      
      // Call the onCancelled callback if provided
      if (onCancelled) {
        onCancelled();
      }

    } catch (error) {
      console.error('❌ CUSTOMER: Unexpected error cancelling booking:', error);
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
