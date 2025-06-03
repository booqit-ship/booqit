
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import CancelBookingButton from './CancelBookingButton';

interface BookingWithDetails {
  id: string;
  user_id: string;
  merchant_id: string;
  service_id: string;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: string;
  created_at: string;
  staff_id?: string | null;
  stylist_name?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  merchant: {
    shop_name: string;
    address: string;
  };
  service: {
    name: string;
    duration: number;
  };
}

const UpcomingBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcomingBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          merchant:merchants!inner(shop_name, address),
          service:services!inner(name, duration)
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      // Type assertion to ensure proper typing
      setBookings((data || []) as BookingWithDetails[]);
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingBookings();
  }, []);

  const handleBookingCancelled = () => {
    // Refresh the bookings list after cancellation
    fetchUpcomingBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
          <p className="text-gray-500">When you book appointments, they'll appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{booking.merchant.shop_name}</CardTitle>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {booking.merchant.address}
                </p>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {formatDateInIST(new Date(booking.date), 'EEE, MMM d, yyyy')}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {formatTimeToAmPm(booking.time_slot)} ({booking.service.duration} min)
              </div>
              {booking.stylist_name && (
                <div className="flex items-center text-sm text-gray-600 col-span-2">
                  <User className="h-4 w-4 mr-2" />
                  Stylist: {booking.stylist_name}
                </div>
              )}
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{booking.service.name}</p>
                  <p className="text-sm text-gray-600">
                    Customer: {booking.customer_name}
                  </p>
                  {booking.customer_phone && (
                    <p className="text-sm text-gray-600">
                      Phone: {booking.customer_phone}
                    </p>
                  )}
                </div>
                
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <CancelBookingButton
                    bookingId={booking.id}
                    onCancelled={handleBookingCancelled}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UpcomingBookings;
