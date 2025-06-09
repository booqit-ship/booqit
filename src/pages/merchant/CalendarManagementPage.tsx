import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, subDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BookingsList from '@/components/merchant/calendar/BookingsList';
import HolidayManager from '@/components/merchant/calendar/HolidayManager';
import WeekCalendar from '@/components/merchant/calendar/WeekCalendar';
import StylistAvailabilityWidget from '@/components/merchant/StylistAvailabilityWidget';
import { formatDateInIST, getCurrentDateIST } from '@/utils/dateUtils';
import { BookingWithServices } from '@/types/booking';

const CalendarManagementPage: React.FC = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateIST());
  const queryClient = useQueryClient();

  // Get merchant data with caching
  const { data: merchant, isFetching: isMerchantFetching } = useQuery({
    queryKey: ['merchant', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const merchantId = merchant?.id;

  // Get bookings with services using the updated structure
  const { data: bookings = [], isFetching: isBookingsFetching, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings-with-services', merchantId, formatDateInIST(selectedDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<BookingWithServices[]> => {
      if (!merchantId || !merchant) return [];
      
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      console.log('Fetching bookings with services for date:', dateStr, 'merchant:', merchantId);
      
      // Get all bookings for the date (including cancelled for audit purposes)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          time_slot,
          status,
          payment_status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          user_id,
          merchant_id,
          staff_id,
          date,
          created_at
        `)
        .eq('merchant_id', merchantId)
        .eq('date', dateStr)
        .order('time_slot', { ascending: true });
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }
      
      // For each booking, fetch its services
      const bookingsWithServices = await Promise.all(
        bookingsData.map(async (booking) => {
          const { data: servicesData, error: servicesError } = await supabase
            .rpc('get_booking_services', { p_booking_id: booking.id });
          
          if (servicesError) {
            console.error('Error fetching services for booking:', booking.id, servicesError);
            // Return booking with empty services if fetch fails
            return {
              ...booking,
              services: [],
              total_duration: 0,
              total_price: 0,
              status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
              merchant: {
                shop_name: merchant.shop_name,
                address: merchant.address,
                image_url: merchant.image_url
              }
            };
          }
          
          const services = servicesData || [];
          const total_duration = services.reduce((sum: number, s: any) => sum + (s.service_duration || 0), 0);
          const total_price = services.reduce((sum: number, s: any) => sum + (s.service_price || 0), 0);
          
          return {
            ...booking,
            services: services.map((s: any) => ({
              service_id: s.service_id,
              service_name: s.service_name,
              service_duration: s.service_duration,
              service_price: s.service_price
            })),
            total_duration,
            total_price,
            status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
            merchant: {
              shop_name: merchant.shop_name,
              address: merchant.address,
              image_url: merchant.image_url
            }
          };
        })
      );
      
      console.log('Fetched bookings with services:', bookingsWithServices);
      return bookingsWithServices;
    },
    enabled: !!merchantId && !!merchant,
    staleTime: 1 * 60 * 1000, // Reduce stale time to 1 minute for more frequent updates
    refetchOnWindowFocus: true,
  });

  // Get holidays with caching
  const { data: holidays = [], isFetching: isHolidaysFetching } = useQuery({
    queryKey: ['shop_holidays', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      
      const { data, error } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('holiday_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
    staleTime: 15 * 60 * 1000,
  });

  // Generate visible days for appointment counts (5 days from selected date)
  const visibleDays = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(selectedDate, i));
  }, [selectedDate]);

  // Get appointment counts with caching
  const { data: appointmentCounts = {}, isFetching: isCountsFetching } = useQuery({
    queryKey: ['appointment-counts', merchantId, visibleDays.map(d => formatDateInIST(d, 'yyyy-MM-dd'))],
    queryFn: async () => {
      if (!merchantId) return {};
      
      const counts: { [date: string]: number } = {};
      
      for (const day of visibleDays) {
        const dateStr = formatDateInIST(day, 'yyyy-MM-dd');
        try {
          const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('merchant_id', merchantId)
            .eq('date', dateStr)
            .neq('status', 'cancelled');
          
          if (!error) {
            counts[dateStr] = count || 0;
          }
        } catch (error) {
          console.error('Error fetching appointment count for', dateStr, error);
        }
      }
      return counts;
    },
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000,
  });

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      console.log('Updating booking status:', bookingId, 'to:', newStatus);
      
      if (newStatus === 'cancelled') {
        const { data, error } = await supabase.rpc('cancel_booking_properly', {
          p_booking_id: bookingId,
          p_user_id: userId
        });

        if (error) {
          console.error('Error cancelling booking:', error);
          toast.error(`Failed to cancel booking: ${error.message}`);
          return;
        }

        const result = data as any;
        if (result && !result.success) {
          toast.error(result.error || 'Failed to cancel booking');
          return;
        }
      } else if (newStatus === 'completed') {
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'completed',
            payment_status: 'completed'
          })
          .eq('id', bookingId);

        if (error) {
          console.error('Error updating booking status:', error);
          toast.error(`Failed to complete booking: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);

        if (error) {
          console.error('Error updating booking status:', error);
          toast.error(`Failed to update booking status: ${error.message}`);
          return;
        }
      }

      toast.success(`Booking ${newStatus} successfully`);
      
      // Force refetch of bookings
      await refetchBookings();
      queryClient.invalidateQueries({ queryKey: ['appointment-counts', merchantId] });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status. Please try again.');
    }
  };

  // Navigate by single day (like customer calendar)
  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(getCurrentDateIST());
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    const { error } = await supabase
      .from('shop_holidays')
      .delete()
      .eq('id', holidayId);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['shop_holidays', merchantId] });
      return true;
    }
    return false;
  };

  const refetchBookings = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings-with-services', merchantId] });
  };

  const refetchHolidays = () => {
    queryClient.invalidateQueries({ queryKey: ['shop_holidays', merchantId] });
  };

  // Set up realtime subscription for booking changes
  useEffect(() => {
    if (!merchantId) return;

    const subscription = supabase
      .channel('calendar-bookings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `merchant_id=eq.${merchantId}`
      }, () => {
        console.log('Booking change detected, refreshing data');
        refetchBookings();
        queryClient.invalidateQueries({ queryKey: ['appointment-counts', merchantId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [merchantId, refetchBookings, queryClient]);

  if (!merchantId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  const isLoading = isBookingsFetching || isHolidaysFetching || isCountsFetching || isMerchantFetching;

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-6 w-6 text-booqit-primary" />
          <h1 className="md:text-3xl text-2xl font-light">Calendar Management</h1>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-booqit-primary ml-2" />
          )}
        </div>
        <p className="text-muted-foreground">Manage your bookings and appointments (IST)</p>
      </div>

      <WeekCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate} 
        onNavigateDay={navigateDay} 
        onGoToToday={goToToday} 
        appointmentCounts={appointmentCounts}
        holidays={holidays}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <BookingsList 
            date={selectedDate} 
            bookings={bookings} 
            isLoading={false}
            onStatusChange={handleStatusChange} 
          />
        </div>

        <div className="space-y-4 md:space-y-6">
          <HolidayManager 
            merchantId={merchantId} 
            holidays={holidays} 
            isLoading={false}
            onDeleteHoliday={handleDeleteHoliday} 
            onHolidayAdded={refetchHolidays} 
          />

          <StylistAvailabilityWidget 
            merchantId={merchantId} 
            selectedDate={selectedDate} 
            onAvailabilityChange={() => {
              refetchBookings();
              refetchHolidays();
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
