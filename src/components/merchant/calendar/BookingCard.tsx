
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
        return 'bg-green-50 text-green-700 border-green-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-l-green-500';
      case 'completed':
        return 'border-l-blue-500';
      case 'cancelled':
        return 'border-l-red-500';
      case 'pending':
      default:
        return 'border-l-amber-500';
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
    <Card className={`relative bg-white border-l-4 ${getCardBorderColor(booking.status)} hover:shadow-md transition-all duration-200 overflow-hidden`}>
      <CardContent className="p-0">
        {/* Header Section with Time and Status */}
        <div className="flex items-center justify-between p-4 pb-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-booqit-primary/10 rounded-full">
              <Clock className="h-5 w-5 text-booqit-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {getTimeRange()}
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(booking.status)} border px-3 py-1 text-xs font-medium`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-4">
          {/* Service Information */}
          {booking.service && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-booqit-primary rounded-full flex-shrink-0"></div>
                <h3 className="font-medium text-gray-900 text-base">{booking.service.name}</h3>
              </div>
              {booking.service.duration && (
                <div className="flex items-center gap-2 ml-4 text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm">{booking.service.duration} minutes</span>
                </div>
              )}
            </div>
          )}

          {/* Customer & Stylist Information */}
          <div className="grid grid-cols-1 gap-3">
            {booking.customer_name && (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium text-gray-900">{booking.customer_name}</span>
              </div>
            )}
            
            {booking.customer_phone && (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <a 
                  href={`tel:${booking.customer_phone}`} 
                  className="text-booqit-primary hover:text-booqit-primary/80 font-medium transition-colors"
                >
                  {booking.customer_phone}
                </a>
              </div>
            )}
            
            {booking.stylist_name && (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm">
                  <Scissors className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-gray-700">
                  <span className="text-gray-500 text-sm">Stylist:</span> 
                  <span className="font-medium ml-1">{booking.stylist_name}</span>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              )}
              
              {booking.status === 'confirmed' && (
                <Button 
                  size="sm" 
                  onClick={() => handleStatusUpdate('completed')} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => handleStatusUpdate('cancelled')}
                className="flex-1 shadow-sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingCard;
