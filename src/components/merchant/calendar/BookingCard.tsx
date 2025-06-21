import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, CheckCircle, XCircle, Scissors, Timer } from 'lucide-react';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInvalidateBookingsData } from '@/hooks/useBookingsData';
import { useBookingCompletion } from '@/hooks/useBookingCompletion';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface BookingWithCustomerDetails {
  id: string;
  merchant_id: string;
  user_id?: string;
  date: string;
  service?: {
    name: string;
    duration?: number;
  };
  services?: string | any;
  total_duration?: number;
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
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const invalidateBookings = useInvalidateBookingsData();
  const { onBookingCompleted } = useBookingCompletion();

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

  const getServiceInfo = () => {
    console.log('BookingCard - Raw booking data:', booking);
    console.log('BookingCard - Services field:', booking.services);
    console.log('BookingCard - Total duration field:', booking.total_duration);
    
    let serviceNames = 'Unknown Service';
    let totalDuration = booking.total_duration || 30;
    
    if (booking.services) {
      try {
        let services;
        
        if (typeof booking.services === 'string') {
          console.log('BookingCard - Parsing string services');
          services = JSON.parse(booking.services);
        } else {
          console.log('BookingCard - Services already parsed');
          services = booking.services;
        }
        
        console.log('BookingCard - Parsed services:', services);
        
        if (Array.isArray(services) && services.length > 0) {
          const serviceNamesList = services
            .map(service => service.name?.trim())
            .filter(Boolean);
          
          if (serviceNamesList.length > 0) {
            serviceNames = serviceNamesList.join(', ');
            totalDuration = booking.total_duration || services.reduce((sum, service) => sum + (service.duration || 0), 0);
            
            console.log('BookingCard - Multiple services found:', { names: serviceNames, duration: totalDuration });
            return { names: serviceNames, duration: totalDuration };
          }
        }
        else if (services && services.name) {
          serviceNames = services.name.trim();
          totalDuration = booking.total_duration || services.duration || 30;
          
          console.log('BookingCard - Single service object found:', { names: serviceNames, duration: totalDuration });
          return { names: serviceNames, duration: totalDuration };
        }
      } catch (error) {
        console.error('BookingCard - Error parsing services JSON:', error);
      }
    }
    
    if (booking.service?.name) {
      serviceNames = booking.service.name.trim();
      totalDuration = booking.total_duration || booking.service.duration || 30;
      
      console.log('BookingCard - Using single service fallback:', { names: serviceNames, duration: totalDuration });
      return { names: serviceNames, duration: totalDuration };
    }
    
    const fallbackData = {
      names: serviceNames, // Will be 'Unknown Service'
      duration: totalDuration // Will be booking.total_duration or 30
    };
    
    console.log('BookingCard - Using final fallback:', fallbackData);
    return fallbackData;
  };

  const serviceInfo = getServiceInfo();

  const getTimeRange = () => {
    const startMinutes = timeToMinutes(booking.time_slot);
    const endMinutes = startMinutes + serviceInfo.duration;
    const endTime = minutesToTime(endMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

  const getCardStyling = () => {
    if (booking.status === 'cancelled') {
      return 'opacity-60 border-l-red-500 bg-red-50/30';
    }
    if (booking.status === 'completed') {
      return 'border-l-blue-500 bg-blue-50/30';
    }
    return 'border-l-booqit-primary';
  };

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      let updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.payment_status = 'completed';
      }

      console.log('Updating booking status...', { bookingId: booking.id, newStatus });

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Failed to update booking status');
        return;
      }

      console.log('Booking status updated successfully');
      
      // If completing booking, trigger completion notification
      if (newStatus === 'completed' && booking.user_id && booking.customer_name) {
        console.log('Triggering booking completion notification...');
        
        // Get merchant name for the notification
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('shop_name')
          .eq('id', booking.merchant_id)
          .single();
        
        const merchantName = merchantData?.shop_name || 'the shop';
        
        // Trigger the completion notification
        onBookingCompleted(booking.user_id, merchantName, booking.id);
        
        console.log('Booking completion notification triggered for customer:', booking.customer_name);
      }
      
      toast.success(`Booking ${newStatus} successfully`);
      
      // Invalidate and refetch relevant queries
      if (booking.merchant_id) {
        const bookingDate = new Date(booking.date);
        invalidateBookings(booking.merchant_id, bookingDate);
      }
      
      await onStatusChange(booking.id, newStatus);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const handleCompleteConfirm = () => {
    handleStatusUpdate('completed');
    setIsCompleteDialogOpen(false);
  };

  const handleCancelConfirm = () => {
    handleStatusUpdate('cancelled');
    setIsCancelDialogOpen(false);
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${getCardStyling()}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className={`font-semibold text-sm ${booking.status === 'cancelled' ? 'line-through text-gray-500' : ''}`}>
                {getTimeRange()}
              </span>
            </div>
            <Badge className={`${getStatusColor(booking.status)} font-medium`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${booking.status === 'cancelled' ? 'bg-red-400' : 'bg-booqit-primary'}`}></div>
              <span className={`font-medium ${booking.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {serviceInfo.names}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Timer className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{serviceInfo.duration} min</span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {booking.customer_name && (
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="h-4 w-4 text-gray-500" />
                <span className={`font-medium ${booking.status === 'cancelled' ? 'text-gray-500' : ''}`}>
                  {booking.customer_name}
                </span>
              </div>
            )}
            
            {booking.customer_phone && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="h-4 w-4 text-gray-500" />
                <a 
                  href={`tel:${booking.customer_phone}`} 
                  className={`${booking.status === 'cancelled' ? 'text-gray-500 cursor-default' : 'text-booqit-primary hover:underline cursor-pointer'}`}
                  onClick={booking.status === 'cancelled' ? (e) => e.preventDefault() : undefined}
                >
                  {booking.customer_phone}
                </a>
              </div>
            )}
            
            {booking.stylist_name && (
              <div className="flex items-center space-x-2 text-gray-700">
                <Scissors className="h-4 w-4 text-gray-500" />
                <span className={booking.status === 'cancelled' ? 'text-gray-500' : ''}>
                  Stylist: <span className="font-medium">{booking.stylist_name}</span>
                </span>
              </div>
            )}
          </div>

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
                  onClick={() => setIsCompleteDialogOpen(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => setIsCancelDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          ) : booking.status === 'cancelled' ? (
            <div className="text-sm text-red-600 font-medium">
              This booking has been cancelled
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this booking as completed? This action will update the booking status and payment information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteConfirm} className="bg-blue-600 hover:bg-blue-700">
              Complete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone and the customer will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-red-600 hover:bg-red-700">
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BookingCard;
