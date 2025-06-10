
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, User, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import BookingConfirmationDialog from '@/components/merchant/BookingConfirmationDialog';

interface BookingWithCustomerDetails {
  id: string;
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

const BookingCard: React.FC<BookingCardProps> = ({ booking, onStatusChange }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel'>('complete');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceInfo = () => {
    if (booking.service) {
      return {
        name: booking.service.name,
        duration: booking.service.duration || booking.total_duration || 30
      };
    }

    // Handle multiple services
    if (booking.services) {
      let services = booking.services;
      if (typeof services === 'string') {
        try {
          services = JSON.parse(services);
        } catch {
          return { name: 'Service', duration: booking.total_duration || 30 };
        }
      }
      
      if (Array.isArray(services) && services.length > 0) {
        const serviceNames = services.map(s => s.name || 'Service').join(', ');
        return {
          name: serviceNames,
          duration: booking.total_duration || 30
        };
      }
    }

    return { name: 'Service', duration: booking.total_duration || 30 };
  };

  const handleStatusChangeClick = (action: 'complete' | 'cancel') => {
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    setIsUpdating(true);
    try {
      const newStatus = confirmAction === 'complete' ? 'completed' : 'cancelled';
      await onStatusChange(booking.id, newStatus);
    } finally {
      setIsUpdating(false);
      setIsConfirmDialogOpen(false);
    }
  };

  const serviceInfo = getServiceInfo();
  const isActive = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <>
      <Card className={`transition-all duration-200 ${
        isActive 
          ? 'border-l-4 border-l-booqit-primary shadow-md hover:shadow-lg' 
          : 'border-l-4 border-l-gray-300 opacity-75'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-booqit-primary" />
                  <span className="font-medium text-booqit-dark">
                    {format(new Date(`2000-01-01T${booking.time_slot}`), 'h:mm a')}
                  </span>
                  <Badge className={`text-xs px-2 py-1 ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
                
                {isActive && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {booking.status !== 'completed' && (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChangeClick('complete')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Completed
                        </DropdownMenuItem>
                      )}
                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChangeClick('cancel')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Booking
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {booking.customer_name || 'Customer'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{serviceInfo.name}</div>
                  <div className="text-xs text-gray-500">
                    Duration: {serviceInfo.duration} mins
                    {booking.stylist_name && ` • Stylist: ${booking.stylist_name}`}
                  </div>
                </div>

                {booking.customer_phone && (
                  <div className="text-xs text-gray-500">
                    Phone: {booking.customer_phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookingConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmStatusChange}
        actionType={confirmAction}
        customerName={booking.customer_name}
        serviceName={serviceInfo.name}
        timeSlot={format(new Date(`2000-01-01T${booking.time_slot}`), 'h:mm a')}
        isLoading={isUpdating}
      />
    </>
  );
};

export default BookingCard;
