
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BookingCard from '@/components/merchant/calendar/BookingCard';
import CalendarNavigation from '@/components/merchant/calendar/CalendarNavigation';
import BookingStats from '@/components/merchant/calendar/BookingStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingService } from '@/types';

interface BookingWithCustomerDetails {
  id: string;
  service?: {
    name: string;
    duration?: number;
  };
  services?: BookingService[];
  total_duration?: number;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
}

const CalendarManagementPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithCustomerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      fetchBookings();
    }
  }, [selectedDate, userId]);

  const fetchBookings = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (merchantError) throw merchantError;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          time_slot,
          status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          services,
          total_duration,
          service:service_id (
            name,
            duration
          )
        `)
        .eq('merchant_id', merchantData.id)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('time_slot', { ascending: true });

      if (error) throw error;

      // Process the data to handle services properly
      const processedBookings = data?.map(booking => ({
        ...booking,
        services: Array.isArray(booking.services) ? booking.services as BookingService[] : undefined
      })) || [];

      setBookings(processedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    await fetchBookings();
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calendar Management</h1>
      </div>

      <CalendarNavigation 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <BookingStats stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>
            Bookings for {format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bookings...</div>
          ) : bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No bookings found for this date
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarManagementPage;
