
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
      let updateData: any = { status: newStatus };
      
      // If completing, also set payment status to completed for earnings calculation
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

        {/* Service name and duration */}
        {booking.service && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-booqit-primary rounded-full"></div>
              <span className="font-medium text-gray-900">{booking.service.name}</span>
            </div>
            {booking.service.duration && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Timer className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{booking.service.duration} min</span>
              </div>
            )}
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

        {/* Action buttons - only show if not cancelled or completed */}
        {booking.status === 'pending' || booking.status === 'confirmed' ? (
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
        ) : null}
      </CardContent>
    </Card>
  );
};

export default BookingCard;
