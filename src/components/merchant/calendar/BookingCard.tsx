import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BookingWithCustomerDetails {
  id: string;
  service?: {
    name: string;
  };
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

interface BookingCardProps {
  booking: BookingWithCustomerDetails;
  onStatusChange: (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => Promise<void>;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onStatusChange
}) => {
  const navigate = useNavigate();

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

  const handleCardClick = () => {
    navigate(`/merchant/booking-summary/${booking.id}`);
  };

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      if (newStatus === 'cancelled') {
        // Use the proper cancellation function for merchant cancellation
        const {
          data,
          error
        } = await supabase.rpc('cancel_booking_properly', {
          p_booking_id: booking.id,
          p_user_id: null // Merchant cancellation - no user restriction
        });
        if (error) {
          console.error('Error cancelling booking:', error);
          toast.error('Failed to cancel booking');
          return;
        }
        const result = data as {
          success: boolean;
          error?: string;
          message?: string;
        };
        if (!result.success) {
          toast.error(result.error || 'Failed to cancel booking');
          return;
        }
        toast.success('Booking cancelled successfully');
        await onStatusChange(booking.id, 'cancelled');
      } else {
        // For confirm/complete, update directly
        const {
          error
        } = await supabase.from('bookings').update({
          status: newStatus
        }).eq('id', booking.id);
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
    <Card 
      className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-booqit-primary cursor-pointer" 
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-lg">
              {formatTimeToAmPm(booking.time_slot)}
            </span>
          </div>
          <Badge className={`${getStatusColor(booking.status)} font-medium`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {booking.service && <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-booqit-primary rounded-full"></div>
              <span className="font-medium">{booking.service.name}</span>
            </div>}
          
          {booking.customer_name && <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4" />
              <span>{booking.customer_name}</span>
            </div>}
          
          {booking.customer_phone && <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{booking.customer_phone}</span>
            </div>}
          
          {booking.customer_email && <div className="flex items-center space-x-2 text-gray-600">
              
              
            </div>}
        </div>

        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {booking.status === 'pending' && <Button size="sm" onClick={() => handleStatusUpdate('confirmed')} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>}
            
            {booking.status === 'confirmed' && <Button size="sm" onClick={() => handleStatusUpdate('completed')} className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>}
            
            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('cancelled')}>
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
