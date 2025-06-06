
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CalendarIcon, Clock, User, Phone, Mail, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

interface BookingDetails {
  id: string;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
  service?: {
    name: string;
    price: number;
    duration: number;
    description?: string;
  };
  merchant?: {
    shop_name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

const MerchantBookingSummaryPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, price, duration, description),
          merchant:merchants(shop_name, address, lat, lng)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      setBooking(data as BookingDetails);
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
      navigate(-1);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDateInIST(date, 'EEEE, MMMM d, yyyy');
  };

  const handleNavigateToLocation = () => {
    if (!booking?.merchant) return;

    const { lat, lng, shop_name, address } = booking.merchant;
    const query = encodeURIComponent(`${shop_name}, ${address}`);
    
    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let mapUrl;
    if (isMobile) {
      // For mobile devices, use the mobile-friendly Google Maps URL with directions
      mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    } else {
      // For desktop, open Google Maps with the location
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    
    window.open(mapUrl, '_blank');
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
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-light">Booking Details</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Booking Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-light">Booking Status</CardTitle>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-light">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.customer_name && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>{booking.customer_name}</span>
              </div>
            )}
            {booking.customer_phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <a href={`tel:${booking.customer_phone}`} className="text-booqit-primary hover:underline">
                  {booking.customer_phone}
                </a>
              </div>
            )}
            {booking.customer_email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${booking.customer_email}`} className="text-booqit-primary hover:underline">
                  {booking.customer_email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-light">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.service && (
              <>
                <div>
                  <h3 className="font-semibold">{booking.service.name}</h3>
                  {booking.service.description && (
                    <p className="text-gray-600 text-sm mt-1">{booking.service.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{booking.service.duration} minutes</span>
                  </div>
                  <span className="font-semibold">₹{booking.service.price}</span>
                </div>
              </>
            )}
            {booking.stylist_name && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>Stylist: {booking.stylist_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-light">Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{formatTimeToAmPm(booking.time_slot)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        {booking.merchant && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-light">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium">{booking.merchant.shop_name}</p>
                  <p className="text-gray-600">{booking.merchant.address}</p>
                </div>
              </div>
              
              <Button 
                onClick={handleNavigateToLocation}
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MerchantBookingSummaryPage;
