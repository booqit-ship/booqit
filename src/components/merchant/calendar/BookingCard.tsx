import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, CheckCircle, XCircle, Scissors, Timer } from 'lucide-react';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingWithCustomerDetails {
  id: string;
  service?: {
    name: string;
    duration?: number;
  };
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
}

interface BookingCardProps {
  booking: BookingWithCustomerDetails;
  onStatusChange: (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => Promise<void>;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onStatusChange
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getTimeRange = () => {
    if (!booking.service?.duration) {
      return formatTimeToAmPm(booking.time_slot);
    }

    const startMinutes = timeToMinutes(booking.time_slot);
    const endMinutes = startMinutes + booking.service.duration;
    const endTime = minutesToTime(endMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      if (newStatus === 'cancelled') {
        // Use the proper cancellation function for merchant cancellation
        const { data, error } = await supabase.rpc('cancel_booking_properly', {
          p_booking_id: booking.id,
          p_user_id: null // Merchant cancellation - no user restriction
        });

        if (error) {
          console.error('Error cancelling booking:', error);
          toast.error('Failed to cancel booking');
          return;
        }

        const result = data as { success: boolean; error?: string; message?: string };
        if (!result.success) {
          toast.error(result.error || 'Failed to cancel booking');
          return;
        }

        toast.success('Booking cancelled successfully');
        await onStatusChange(booking.id, 'cancelled');
      } else {
        // For confirm/complete, update directly
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', booking.id);

        if (error) {
          console.error('Error updating booking status:', error);
          toast.error('Failed to update booking status');
          return;
        }

        toast.success(`Booking ${newStatus} successfully`);
        await onStatusChange(booking.id, newStatus);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md border-l-4 ${
      booking.status === 'completed' ? 'border-l-blue-500 bg-blue-50/30' : 
      booking.status === 'confirmed' ? 'border-l-green-500' :
      booking.status === 'pending' ? 'border-l-yellow-500' :
      'border-l-gray-400'
    }`}>
      <CardContent className="p-5">
        {/* Header: Time Range and Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-lg font-semibold text-gray-900">
              {getTimeRange()}
            </span>
          </div>
          <Badge className={`${getStatusColor(booking.status)} text-xs px-3 py-1 font-medium`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Service Information */}
        {booking.service && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-booqit-primary rounded-full"></div>
              <span className="font-medium text-gray-900 text-base">
                {booking.service.name}
              </span>
            </div>
            {booking.service.duration && (
              <div className="flex items-center gap-2 ml-4">
                <Timer className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {booking.service.duration} min
                </span>
              </div>
            )}
          </div>
        )}

        {/* Customer Details */}
        <div className="space-y-3 mb-4">
          {booking.customer_name && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-800 font-medium">
                {booking.customer_name}
              </span>
            </div>
          )}

          {booking.customer_phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <a 
                href={`tel:${booking.customer_phone}`} 
                className="text-booqit-primary hover:text-booqit-primary/80 hover:underline transition-colors font-medium"
              >
                {booking.customer_phone}
              </a>
            </div>
          )}

          {booking.stylist_name && (
            <div className="flex items-center gap-3">
              <Scissors className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700">
                Stylist: <span className="font-medium">{booking.stylist_name}</span>
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {booking.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusUpdate('confirmed')} 
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}
            
            {booking.status === 'confirmed' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusUpdate('completed')} 
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => handleStatusUpdate('cancelled')}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingCard;
