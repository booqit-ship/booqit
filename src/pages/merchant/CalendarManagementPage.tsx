
import React, { useState } from 'react';
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

interface BookingWithCustomerDetails {
  id: string;
  merchant_id: string;
  date: string;
  service?: {
    name: string;
    duration?: number;
  };
  services?: string | any; // JSON string or parsed object
  total_duration?: number;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
}

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
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const merchantId = merchant?.id;

  // Get bookings with enhanced caching and proper typing - FIXED QUERY
  const { data: bookings = [], isFetching: isBookingsFetching } = useQuery({
    queryKey: ['bookings', merchantId, formatDateInIST(selectedDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<BookingWithCustomerDetails[]> => {
      if (!merchantId) return [];
      
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      console.log('Fetching bookings for date:', dateStr, 'merchant:', merchantId);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          merchant_id,
          date,
          time_slot,
          status,
          payment_status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          services,
          total_duration,
          serviceDetails:service_id (
            name,
            duration
          )
        `)
        .eq('merchant_id', merchantId)
        .eq('date', dateStr)
        .order('time_slot', { ascending: true });
      
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log('Fetched bookings:', data);
      
      // Transform and type the data properly
      return (data || []).map(booking => ({
        id: booking.id,
        merchant_id: booking.merchant_id,
        date: booking.date,
        service: booking.serviceDetails ? {
          name: booking.serviceDetails.name,
          duration: booking.serviceDetails.duration
        } : undefined,
        services: booking.services, // Include the JSON services field
        total_duration: booking.total_duration,
        time_slot: booking.time_slot,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        stylist_name: booking.stylist_name
      }));
    },
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    staleTime: 15 * 60 * 1000, // 15 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      console.log('Updating booking status:', bookingId, 'to:', newStatus);
      
      let updateData: any = { status: newStatus };
      
      // If completing, also set payment status to completed for earnings calculation
      if (newStatus === 'completed') {
        updateData.payment_status = 'completed';
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error(`Failed to update booking status: ${error.message}`);
        return;
      }

      toast.success(`Booking ${newStatus} successfully`);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['bookings', merchantId] });
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

  const refetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings', merchantId] });
  };

  const refetchHolidaysData = () => {
    queryClient.invalidateQueries({ queryKey: ['shop_holidays', merchantId] });
  };

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
            isLoading={false} // Always show cached data, use isFetching for spinner
            onStatusChange={handleStatusChange} 
          />
        </div>

        <div className="space-y-4 md:space-y-6">
          <HolidayManager 
            merchantId={merchantId} 
            holidays={holidays} 
            isLoading={false} // Always show cached data
            onDeleteHoliday={handleDeleteHoliday} 
            onHolidayAdded={refetchHolidaysData} 
          />

          <StylistAvailabilityWidget 
            merchantId={merchantId} 
            selectedDate={selectedDate} 
            onAvailabilityChange={() => {
              refetchData();
              refetchHolidaysData();
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
