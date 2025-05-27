
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Clock, User, Phone, Mail, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePhoneCall = (phoneNumber: string | null) => {
    if (phoneNumber && phoneNumber.trim() !== '') {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      toast({
        title: "No Phone Number",
        description: "No phone number available for this customer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900">{booking.service?.name}</h3>
              <p className="text-purple-600 font-medium text-sm">
                {booking.time_slot}
              </p>
            </div>
          </div>
          <Badge 
            className={`${getStatusColor(booking.status)} text-white font-medium px-2 py-1 text-xs`}
          >
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {booking.customer_name}
              </span>
            </div>
            
            {booking.customer_phone && booking.customer_phone.trim() !== '' ? (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <button
                  onClick={() => handlePhoneCall(booking.customer_phone)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium underline decoration-2 underline-offset-2 transition-colors"
                >
                  {booking.customer_phone}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">No phone available</span>
              </div>
            )}

            {booking.customer_email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{booking.customer_email}</span>
              </div>
            )}
          </div>
        </div>
        
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className="flex justify-end gap-2">
            {booking.status === 'pending' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white font-medium px-3 h-8"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Confirm
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to confirm this booking for {booking.customer_name || 'the customer'}?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onStatusChange(booking.id, 'confirmed')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Confirm Booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {booking.status === 'confirmed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 h-8"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Mark this booking as completed for {booking.customer_name || 'the customer'}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onStatusChange(booking.id, 'completed')}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Mark Complete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  size="sm"
                  className="font-medium px-3 h-8"
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this booking for {booking.customer_name || 'the customer'}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onStatusChange(booking.id, 'cancelled')}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Cancel Booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
