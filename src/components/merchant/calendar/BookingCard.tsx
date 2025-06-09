
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, CheckCircle, XCircle, Scissors, Timer, Package } from 'lucide-react';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookingWithServices } from '@/types/booking';

interface BookingCardProps {
  booking: BookingWithServices;
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
    if (!booking.total_duration || booking.total_duration === 0) {
      return formatTimeToAmPm(booking.time_slot);
    }
    
    const startMinutes = timeToMinutes(booking.time_slot);
    const endMinutes = startMinutes + booking.total_duration;
    const endTime = minutesToTime(endMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      if (newStatus === 'cancelled') {
        const { data, error } = await supabase.rpc('cancel_booking_properly', {
          p_booking_id: booking.id,
          p_user_id: null
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
        let updateData: any = { status: newStatus };
        
        if (newStatus === 'completed') {
          updateData.payment_status = 'completed';
        }

        const { error } = await supabase
          .from('bookings')
          .update(updateData)
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
    <Card className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${
      booking.status === 'completed' ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-booqit-primary'
    }`}>
      <CardContent className="p-4">
        {/* Header with time range and status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-sm">
              {getTimeRange()}
            </span>
          </div>
          <Badge className={`${getStatusColor(booking.status)} font-medium`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Services list */}
        {booking.services && booking.services.length > 0 ? (
          <div className="space-y-2 mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-booqit-primary" />
              <span className="font-medium text-gray-900">
                {booking.services.length === 1 ? '1 Service' : `${booking.services.length} Services`}
              </span>
            </div>
            
            {booking.services.map((service, index) => (
              <div key={service.service_id} className="ml-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">{service.service_name}</span>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Timer className="h-3 w-3" />
                    <span>{service.service_duration} min</span>
                    <span className="text-booqit-primary font-medium">₹{service.service_price}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total duration and price */}
            <div className="ml-6 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Timer className="h-4 w-4 text-booqit-primary" />
                  <span>Total: {booking.total_duration} min</span>
                </div>
                <span className="text-booqit-primary font-semibold">₹{booking.total_price}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-500">No services found</span>
            </div>
          </div>
        )}

        {/* Customer and stylist information */}
        <div className="space-y-2 mb-4">
          {booking.customer_name && (
            <div className="flex items-center space-x-2 text-gray-700">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{booking.customer_name}</span>
            </div>
          )}
          
          {booking.customer_phone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-500" />
              <a 
                href={`tel:${booking.customer_phone}`} 
                className="text-booqit-primary hover:underline cursor-pointer"
              >
                {booking.customer_phone}
              </a>
            </div>
          )}
          
          {booking.stylist_name && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Scissors className="h-4 w-4 text-gray-500" />
              <span>Stylist: <span className="font-medium">{booking.stylist_name}</span></span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusUpdate('confirmed')} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}
            
            {booking.status === 'confirmed' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusUpdate('completed')} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => handleStatusUpdate('cancelled')}
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
