
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, Scissors } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  stylist_name?: string;
}

interface BookingCardProps {
  booking: BookingWithCustomerDetails;
  onStatusChange: (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => Promise<void>;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    setIsLoading(true);
    try {
      // Update booking status directly
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Failed to update booking status');
        return;
      }

      // Show success message
      const statusMessages = {
        confirmed: 'Booking confirmed successfully',
        completed: 'Booking marked as completed',
        cancelled: 'Booking cancelled successfully'
      };

      toast.success(statusMessages[newStatus] || 'Booking updated successfully');
      
      // Call the parent's onStatusChange to refresh data
      await onStatusChange(booking.id, newStatus);

    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-l-4 border-l-booqit-primary hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center text-booqit-primary font-semibold">
                <Clock className="h-4 w-4 mr-1" />
                {formatTimeToAmPm(booking.time_slot)}
              </div>
              <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm">
              {booking.customer_name && (
                <div className="flex items-center text-gray-700">
                  <User className="h-3 w-3 mr-2 text-gray-500" />
                  <span className="font-medium">{booking.customer_name}</span>
                </div>
              )}
              
              {booking.customer_phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-3 w-3 mr-2 text-gray-500" />
                  <span>{booking.customer_phone}</span>
                </div>
              )}
              
              {booking.stylist_name && (
                <div className="flex items-center text-gray-700">
                  <Scissors className="h-3 w-3 mr-2 text-gray-500" />
                  <span className="font-medium">Stylist: {booking.stylist_name}</span>
                </div>
              )}
              
              {booking.service?.name && (
                <div className="text-gray-600 text-xs">
                  Service: {booking.service.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            {booking.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={isLoading}
                  className="text-xs h-7 px-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isLoading}
                  className="text-xs h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cancel
                </Button>
              </>
            )}
            
            {booking.status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isLoading}
                  className="text-xs h-7 px-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isLoading}
                  className="text-xs h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingCard;
