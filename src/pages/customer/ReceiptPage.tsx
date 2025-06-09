
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, MapPin, User, Package, Phone, Mail, Timer } from 'lucide-react';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { getBookingWithServices } from '@/utils/bookingUtils';
import { toast } from 'sonner';
import CancelBookingButton from '@/components/customer/CancelBookingButton';

const ReceiptPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;
      
      try {
        const bookingData = await getBookingWithServices(bookingId);
        setBooking(bookingData);
      } catch (error) {
        console.error('Error fetching booking:', error);
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const getTimeRange = () => {
    if (!booking?.total_duration || booking.total_duration === 0) {
      return formatTimeToAmPm(booking.time_slot);
    }
    
    const startMinutes = timeToMinutes(booking.time_slot);
    const endMinutes = startMinutes + booking.total_duration;
    const endTime = minutesToTime(endMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

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

  const getShopImage = (merchant: any) => {
    if (merchant?.image_url && merchant.image_url.trim() !== '') {
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h1 className="text-2xl font-light mb-4">Booking Not Found</h1>
        <p className="text-gray-600">The booking you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-light mb-2">Booking Receipt</h1>
        <Badge className={`${getStatusColor(booking.status)} font-medium`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>

      {/* Shop Information */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 flex-shrink-0">
              <img 
                src={getShopImage(booking.merchant)} 
                alt={booking.merchant?.shop_name}
                className="w-full h-full object-cover rounded-lg shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {booking.merchant?.shop_name}
              </h3>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{booking.merchant?.address}</span>
              </div>
              {booking.stylist_name && (
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-1" />
                  <span className="text-sm">Stylist: {booking.stylist_name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {new Date(booking.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">{getTimeRange()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Booking ID:</span>
            <span className="font-mono text-sm">{booking.id.split('-')[0].toUpperCase()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Services ({booking.services?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {booking.services && booking.services.length > 0 ? (
            <div className="space-y-3">
              {booking.services.map((service: any, index: number) => (
                <div key={service.service_id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{service.service_name}</p>
                    <div className="flex items-center text-sm text-gray-600">
                      <Timer className="h-3 w-3 mr-1" />
                      <span>{service.service_duration} minutes</span>
                    </div>
                  </div>
                  <p className="font-semibold text-booqit-primary">₹{service.service_price}</p>
                </div>
              ))}
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <div>
                  <p>Total</p>
                  <p className="text-sm text-gray-600 font-normal">{booking.total_duration} minutes total</p>
                </div>
                <p className="text-booqit-primary">₹{booking.total_price}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No services information available</p>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      {(booking.customer_phone || booking.customer_email) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{booking.customer_phone}</span>
              </div>
            )}
            
            {booking.customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{booking.customer_email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {booking.status === 'pending' && (
          <CancelBookingButton 
            bookingId={booking.id} 
            onCancelled={() => {
              setBooking(prev => ({ ...prev, status: 'cancelled' }));
            }}
          />
        )}
        
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default ReceiptPage;
