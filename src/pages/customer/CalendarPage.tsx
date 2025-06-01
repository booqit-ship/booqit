
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import CancelBookingButton from '@/components/customer/CancelBookingButton';

interface BookingWithDetails {
  id: string;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
  service?: {
    id: string;
    name: string;
    price: number;
    duration: number;
    description?: string;
  };
  merchant?: {
    shop_name: string;
    address: string;
    rating?: number;
  };
}

const CalendarPage: React.FC = () => {
  const { userId } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchBookings();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`user-bookings-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${userId}`
          },
          () => {
            console.log('Booking update received');
            fetchBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchBookings = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          time_slot,
          status,
          payment_status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          service:service_id (
            id,
            name,
            price,
            duration,
            description
          ),
          merchant:merchant_id (
            shop_name,
            address,
            rating
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('time_slot', { ascending: false });

      if (error) throw error;

      const processedBookings: BookingWithDetails[] = (data || []).map(booking => ({
        id: booking.id,
        date: booking.date,
        time_slot: booking.time_slot,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
        payment_status: booking.payment_status,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        stylist_name: booking.stylist_name,
        service: booking.service as BookingWithDetails['service'],
        merchant: booking.merchant as BookingWithDetails['merchant']
      }));

      setBookings(processedBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCancelSuccess = () => {
    fetchBookings();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          My Bookings
        </h1>
        <p className="text-gray-600">View and manage your appointments</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600">You haven't made any bookings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-l-4 border-l-booqit-primary">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{booking.service?.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.merchant?.shop_name}</span>
                      {booking.merchant?.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span>{booking.merchant.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(booking.status)} text-white`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-booqit-primary" />
                      <span>{format(parseISO(booking.date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-booqit-primary" />
                      <span>{formatTimeToAmPm(booking.time_slot)}</span>
                    </div>
                    {booking.stylist_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-booqit-primary" />
                        <span>{booking.stylist_name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-600">Duration: </span>
                      <span>{booking.service?.duration} minutes</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Price: </span>
                      <span className="font-semibold text-booqit-primary">₹{booking.service?.price}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Payment: </span>
                      <Badge variant="outline" className="text-xs">
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {booking.merchant?.address && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{booking.merchant.address}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <CancelBookingButton
                    bookingId={booking.id}
                    bookingDate={booking.date}
                    bookingTime={booking.time_slot}
                    bookingStatus={booking.status}
                    userId={userId}
                    onCancelSuccess={handleCancelSuccess}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
