
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Phone, Mail, Check, X, CircleCheck } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { useBookingStatus } from '@/hooks/useBookingStatus';
import { useAuth } from '@/contexts/AuthContext';

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

const BookingCard: React.FC<BookingCardProps> = ({ booking, onStatusChange }) => {
  const { updateBookingStatus, isUpdating } = useBookingStatus();
  const { userId } = useAuth();

  const handleStatusUpdate = async (newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    const success = await updateBookingStatus(booking.id, newStatus, userId);
    if (success) {
      // Trigger parent refresh
      await onStatusChange(booking.id, newStatus);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 hover:bg-green-600';
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'completed': return 'bg-blue-500 hover:bg-blue-600';
      case 'cancelled': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Card className="border-l-4 border-l-booqit-primary hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-booqit-primary/10 p-2 rounded-full">
              <Clock className="h-4 w-4 text-booqit-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{booking.service?.name || 'Service'}</h3>
              <p className="text-sm text-gray-600">{formatTimeToAmPm(booking.time_slot)}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(booking.status)} text-white`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <User className="h-4 w-4 mr-2" />
            <span>{booking.customer_name || 'Walk-in Customer'}</span>
          </div>
          
          {booking.customer_phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2" />
              <span>{booking.customer_phone}</span>
            </div>
          )}
          
          {booking.customer_email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span>{booking.customer_email}</span>
            </div>
          )}
        </div>

        {booking.status !== 'cancelled' && (
          <div className="flex space-x-2">
            {booking.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            
            {booking.status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CircleCheck className="h-3 w-3 mr-1" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingCard;
